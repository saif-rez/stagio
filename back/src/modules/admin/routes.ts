// Back-office: company accounts & claims, company pages, external offers, sponsoring,
// certificate checks and moderation of reported reviews. ADMIN role on every route.
import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { paginated, paginationSchema, toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { DAY_MS } from "../../lib/rules.js";
import { signedCertificateUrl } from "../../lib/storage.js";
import { currentUser, requireRole } from "../../middleware/auth.js";
import { notify } from "../../services/notifications.js";
import { offerInclude, serializeOffer } from "../offers/serialize.js";
import { reviewInclude, serializeReview } from "../reviews/serialize.js";
import { offerBody } from "../company/routes.js";

export const adminRouter = Router();
adminRouter.use(requireRole("ADMIN"));

const id = (v: unknown) => String(v);

adminRouter.get("/stats", async (_req, res) => {
  const [students, verifiedStudents, reviews, ratedCompanies, claimedCompanies, pendingClaims, pendingCompanies, pendingCertificates, hiddenReviews] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "STUDENT", emailVerifiedAt: { not: null } } }),
      prisma.review.count({ where: { status: "PUBLISHED" } }),
      prisma.review.groupBy({ by: ["companyId"], where: { status: "PUBLISHED" } }).then((g) => g.length),
      prisma.user.count({ where: { role: "COMPANY", companyId: { not: null } } }),
      prisma.companyClaim.count({ where: { status: "PENDING" } }),
      prisma.company.count({ where: { status: "PENDING", proposedById: { not: null } } }),
      prisma.internship.count({ where: { status: "PENDING_VERIFICATION" } }),
      prisma.review.count({ where: { status: "HIDDEN" } }),
    ]);
  // Beta success indicators + moderation queues.
  res.json({
    beta: { students, verifiedStudents, reviews, ratedCompanies, claimedCompanies },
    queues: { pendingClaims, pendingCompanies, pendingCertificates, hiddenReviews },
  });
});

// ---------- Company accounts & claims ----------

adminRouter.get("/claims", async (req, res) => {
  const q = paginationSchema
    .extend({ status: z.enum(["PENDING", "ACCEPTED", "REFUSED"]).default("PENDING") })
    .parse(req.query);
  const where = { status: q.status };
  const [items, total] = await Promise.all([
    prisma.companyClaim.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, emailVerifiedAt: true } },
        company: { select: { id: true, name: true, city: true, sector: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
      ...toSkipTake(q),
    }),
    prisma.companyClaim.count({ where }),
  ]);
  res.json(paginated(items, total, q));
});

adminRouter.post("/claims/:id/accept", async (req, res) => {
  const claim = await prisma.companyClaim.findUnique({
    where: { id: id(req.params.id) },
    include: { company: { include: { owner: true } } },
  });
  if (!claim) throw notFound("Demande introuvable.");
  if (claim.status !== "PENDING") throw conflict("Demande déjà traitée.");
  if (claim.company.owner) throw conflict("Cette fiche est déjà gérée par un autre compte.", "ALREADY_CLAIMED");
  await prisma.$transaction([
    prisma.companyClaim.update({ where: { id: claim.id }, data: { status: "ACCEPTED", decidedAt: new Date() } }),
    prisma.company.update({ where: { id: claim.companyId }, data: { status: "ACTIVE" } }),
    prisma.user.update({ where: { id: claim.userId }, data: { companyId: claim.companyId } }),
    // Other pending claims on the same page are refused.
    prisma.companyClaim.updateMany({
      where: { companyId: claim.companyId, status: "PENDING", id: { not: claim.id } },
      data: { status: "REFUSED", decidedAt: new Date() },
    }),
  ]);
  await notify({
    userId: claim.userId,
    type: "COMPANY_ACCOUNT_VALIDATED",
    title: "Votre compte entreprise est validé",
    body: `Vous gérez désormais la fiche ${claim.company.name} sur Stagio.`,
    link: "/entreprise",
  });
  res.json({ ok: true });
});

adminRouter.post("/claims/:id/refuse", async (req, res) => {
  const claim = await prisma.companyClaim.findUnique({ where: { id: id(req.params.id) }, include: { company: true } });
  if (!claim) throw notFound("Demande introuvable.");
  if (claim.status !== "PENDING") throw conflict("Demande déjà traitée.");
  await prisma.$transaction([
    prisma.companyClaim.update({ where: { id: claim.id }, data: { status: "REFUSED", decidedAt: new Date() } }),
    // A page created at sign-up (never active) is refused with its account.
    ...(claim.company.status === "PENDING" && !claim.company.proposedById
      ? [prisma.company.update({ where: { id: claim.companyId }, data: { status: "REFUSED" } })]
      : []),
  ]);
  await notify({
    userId: claim.userId,
    type: "COMPANY_ACCOUNT_REFUSED",
    title: "Votre demande de compte entreprise a été refusée",
    body: "Les informations fournies (matricule fiscal / RNE) n'ont pas pu être vérifiées. Contactez l'équipe Stagio pour plus d'informations.",
  });
  res.json({ ok: true });
});

// ---------- Company pages ----------

adminRouter.get("/companies", async (req, res) => {
  const q = paginationSchema
    .extend({
      status: z.enum(["ACTIVE", "PENDING", "REFUSED"]).optional(),
      proposed: z.enum(["true", "false"]).optional(),
      search: z.string().trim().max(100).optional(),
    })
    .parse(req.query);
  const where: Prisma.CompanyWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.proposed === "true" ? { proposedById: { not: null } } : {}),
    ...(q.search ? { name: { contains: q.search, mode: "insensitive" } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        proposedBy: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { internships: true, reviews: true, offers: true } },
      },
      orderBy: { createdAt: "desc" },
      ...toSkipTake(q),
    }),
    prisma.company.count({ where }),
  ]);
  res.json(paginated(items, total, q));
});

const companyBody = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  sector: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).default(""),
});

/** Company page without an account (students can review it right away). */
adminRouter.post("/companies", async (req, res) => {
  const body = companyBody.parse(req.body);
  const company = await prisma.company.create({ data: { ...body, status: "ACTIVE" } });
  res.status(201).json({ company });
});

adminRouter.patch("/companies/:id", async (req, res) => {
  const body = companyBody.partial().parse(req.body);
  const company = await prisma.company.update({ where: { id: id(req.params.id) }, data: body });
  res.json({ company });
});

/** Student proposal: approve, refuse, or merge into an existing page (anti-duplicates). */
adminRouter.post("/companies/:id/approve", async (req, res) => {
  const company = await prisma.company.update({
    where: { id: id(req.params.id) },
    data: { status: "ACTIVE" },
  });
  res.json({ company });
});

adminRouter.post("/companies/:id/refuse", async (req, res) => {
  const company = await prisma.company.update({
    where: { id: id(req.params.id) },
    data: { status: "REFUSED" },
  });
  res.json({ company });
});

adminRouter.post("/companies/:id/merge", async (req, res) => {
  const sourceId = id(req.params.id);
  const { targetId } = z.object({ targetId: z.string().min(1) }).parse(req.body);
  if (sourceId === targetId) throw badRequest("Choisissez une autre fiche.");
  const [source, target] = await Promise.all([
    prisma.company.findUnique({ where: { id: sourceId }, include: { owner: true } }),
    prisma.company.findUnique({ where: { id: targetId } }),
  ]);
  if (!source || !target) throw notFound("Entreprise introuvable.");
  if (source.owner) throw conflict("Impossible de fusionner une fiche gérée par un compte entreprise.");
  await prisma.$transaction([
    prisma.internship.updateMany({ where: { companyId: sourceId }, data: { companyId: targetId } }),
    prisma.review.updateMany({ where: { companyId: sourceId }, data: { companyId: targetId } }),
    prisma.offer.updateMany({ where: { companyId: sourceId }, data: { companyId: targetId } }),
    prisma.report.updateMany({ where: { companyId: sourceId }, data: { companyId: targetId } }),
    prisma.company.delete({ where: { id: sourceId } }),
  ]);
  res.json({ ok: true, targetId });
});

// ---------- Offers ----------

adminRouter.get("/offers", async (req, res) => {
  const q = paginationSchema
    .extend({
      sponsorRequested: z.enum(["true", "false"]).optional(),
      search: z.string().trim().max(100).optional(),
    })
    .parse(req.query);
  const where: Prisma.OfferWhereInput = {
    ...(q.sponsorRequested === "true" ? { sponsorRequested: true, sponsored: false } : {}),
    ...(q.search ? { title: { contains: q.search, mode: "insensitive" } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.offer.findMany({ where, include: offerInclude, orderBy: { createdAt: "desc" }, ...toSkipTake(q) }),
    prisma.offer.count({ where }),
  ]);
  res.json(
    paginated(
      items.map((o) => ({
        ...serializeOffer(o),
        active: o.active,
        views: o.views,
        sponsorRequested: o.sponsorRequested,
        sponsoredUntil: o.sponsoredUntil,
      })),
      total,
      q,
    ),
  );
});

/** External offer (LinkedIn, Tanitjobs, posted at the faculty, a professor's PFE subject…). */
adminRouter.post("/offers", async (req, res) => {
  const me = currentUser(req);
  const body = offerBody
    .and(
      z.object({
        companyId: z.string().min(1),
        sourceName: z.string().trim().min(2).max(80),
        sourceUrl: z.url().max(500).optional(),
      }),
    )
    .parse(req.body);
  const company = await prisma.company.findUnique({ where: { id: body.companyId } });
  if (!company) throw notFound("Entreprise introuvable.");
  const offer = await prisma.offer.create({
    data: {
      ...body,
      applicationUrl: body.applicationMode === "LINK" ? body.applicationUrl! : null,
      applicationEmail: body.applicationMode === "EMAIL" ? body.applicationEmail! : null,
      sourceUrl: body.sourceUrl ?? null,
      createdById: me.id,
    },
    include: offerInclude,
  });
  res.status(201).json({ offer: serializeOffer(offer) });
});

adminRouter.patch("/offers/:id", async (req, res) => {
  const body = z.object({ active: z.boolean() }).parse(req.body);
  const offer = await prisma.offer.update({ where: { id: id(req.params.id) }, data: body, include: offerInclude });
  res.json({ offer: serializeOffer(offer) });
});

/** Turn sponsoring on (7 or 30 days, or open-ended during the beta) or off. Ratings are unaffected. */
adminRouter.post("/offers/:id/sponsor", async (req, res) => {
  const body = z
    .object({ sponsored: z.boolean(), days: z.union([z.literal(7), z.literal(30)]).optional() })
    .parse(req.body);
  const offer = await prisma.offer.update({
    where: { id: id(req.params.id) },
    data: body.sponsored
      ? {
          sponsored: true,
          sponsorRequested: false,
          sponsoredUntil: body.days ? new Date(Date.now() + body.days * DAY_MS) : null,
        }
      : { sponsored: false, sponsoredUntil: null },
    include: offerInclude,
  });
  res.json({ offer: serializeOffer(offer) });
});

// ---------- Internship certificates ----------

adminRouter.get("/internships", async (req, res) => {
  const q = paginationSchema
    .extend({
      status: z.enum(["DECLARED", "PENDING_VERIFICATION", "VERIFIED", "REJECTED"]).default("PENDING_VERIFICATION"),
    })
    .parse(req.query);
  const where = { status: q.status };
  const [items, total] = await Promise.all([
    prisma.internship.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      ...toSkipTake(q),
    }),
    prisma.internship.count({ where }),
  ]);
  res.json(
    paginated(
      items.map(({ certificateKey, ...i }) => ({ ...i, hasCertificate: !!certificateKey })),
      total,
      q,
    ),
  );
});

/** Short-lived signed link to the private certificate (admin only). */
adminRouter.get("/internships/:id/certificate", async (req, res) => {
  const internship = await prisma.internship.findUnique({ where: { id: id(req.params.id) } });
  if (!internship?.certificateKey) throw notFound("Aucune attestation pour ce stage.");
  res.json(signedCertificateUrl(internship.certificateKey));
});

adminRouter.post("/internships/:id/verify", async (req, res) => {
  const internship = await prisma.internship.findUnique({ where: { id: id(req.params.id) } });
  if (!internship) throw notFound("Stage introuvable.");
  if (!internship.certificateKey) throw badRequest("Aucune attestation à vérifier.");
  await prisma.internship.update({ where: { id: internship.id }, data: { status: "VERIFIED" } });
  if (internship.studentId) {
    await notify({
      userId: internship.studentId,
      type: "INTERNSHIP_VERIFIED",
      title: "Badge « Stage vérifié » accordé",
      body: "Votre attestation a été validée : votre avis affiche désormais le badge « Stage vérifié ».",
      link: "/mes-stages",
    });
  }
  res.json({ ok: true });
});

adminRouter.post("/internships/:id/reject", async (req, res) => {
  const internship = await prisma.internship.update({
    where: { id: id(req.params.id) },
    data: { status: "REJECTED" },
  });
  res.json({ ok: true, status: internship.status });
});

// ---------- Moderation ----------

adminRouter.get("/reviews", async (req, res) => {
  const me = currentUser(req);
  const q = paginationSchema
    .extend({
      status: z.enum(["PUBLISHED", "HIDDEN", "CHANGES_REQUESTED", "REMOVED"]).optional(),
      reported: z.enum(["true", "false"]).default("true"),
    })
    .parse(req.query);
  const where: Prisma.ReviewWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.reported === "true" ? { reportCount: { gt: 0 } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { ...reviewInclude, reports: { where: { resolvedAt: null }, select: { reason: true, createdAt: true } } },
      orderBy: [{ reportCount: "desc" }, { createdAt: "desc" }],
      ...toSkipTake(q),
    }),
    prisma.review.count({ where }),
  ]);
  res.json(
    paginated(
      items.map((r) => ({ ...serializeReview(r, me), reports: r.reports })),
      total,
      q,
    ),
  );
});

adminRouter.post("/reviews/:id/moderate", async (req, res) => {
  const { decision, note } = z
    .object({
      decision: z.enum(["KEEP", "REMOVE", "REQUEST_CHANGES"]),
      note: z.string().trim().max(500).optional(),
    })
    .parse(req.body);
  const review = await prisma.review.findUnique({ where: { id: id(req.params.id) } });
  if (!review) throw notFound("Avis introuvable.");
  const status = decision === "KEEP" ? "PUBLISHED" : decision === "REMOVE" ? "REMOVED" : "CHANGES_REQUESTED";
  await prisma.$transaction([
    prisma.review.update({
      where: { id: review.id },
      data: { status, ...(decision === "KEEP" ? { reportCount: 0 } : {}) },
    }),
    prisma.report.updateMany({ where: { reviewId: review.id, resolvedAt: null }, data: { resolvedAt: new Date() } }),
  ]);
  if (review.authorId && decision !== "KEEP") {
    await notify({
      userId: review.authorId,
      type: decision === "REMOVE" ? "REVIEW_REMOVED" : "REVIEW_CHANGES_REQUESTED",
      title: decision === "REMOVE" ? "Votre avis a été supprimé" : "Modification demandée sur votre avis",
      body:
        (decision === "REMOVE"
          ? "Après examen, votre avis ne respecte pas les règles de la communauté."
          : "Merci de modifier votre avis pour qu'il respecte les règles de la communauté. Il sera de nouveau visible après modification.") +
        (note ? `\n\nMessage de la modération : ${note}` : ""),
      link: "/profil",
    });
  }
  res.json({ ok: true, status });
});
