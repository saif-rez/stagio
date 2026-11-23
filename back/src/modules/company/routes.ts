// Company workspace: dashboard, own offers, reviews received, page claims.
import { Router } from "express";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import { paginated, paginationSchema, toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import {
  currentCompanyId,
  currentUser,
  requireRole,
  requireValidatedCompany,
} from "../../middleware/auth.js";
import { companyRating } from "../companies/ratings.js";
import { offerInclude, serializeOffer } from "../offers/serialize.js";
import { reviewInclude, serializeReview } from "../reviews/serialize.js";

export const companyRouter = Router();

export const offerBody = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(20).max(8000),
    city: z.string().trim().min(2).max(80),
    type: z.enum(["PFE", "SUMMER"]),
    domain: z.string().trim().min(2).max(60),
    applicationMode: z.enum(["LINK", "EMAIL"]),
    applicationUrl: z.url().max(500).optional(),
    applicationEmail: z.email().max(254).optional(),
  })
  .refine(
    (o) => (o.applicationMode === "LINK" ? !!o.applicationUrl : !!o.applicationEmail),
    { message: "Indiquez le lien ou l'email de candidature.", path: ["applicationMode"] },
  );

/** A refused or new company account can (re)claim an existing page. */
companyRouter.post("/claims", requireRole("COMPANY"), async (req, res) => {
  const me = currentUser(req);
  if (me.companyId) throw conflict("Votre compte gère déjà une fiche entreprise.");
  const body = z
    .object({
      companyId: z.string().min(1),
      taxId: z.string().trim().min(4).max(50),
      rne: z.string().trim().max(50).optional(),
    })
    .parse(req.body);
  const company = await prisma.company.findFirst({
    where: { id: body.companyId, status: "ACTIVE" },
    include: { owner: { select: { id: true } } },
  });
  if (!company) throw notFound("Entreprise introuvable.");
  if (company.owner) throw conflict("Cette fiche est déjà gérée par un compte.", "ALREADY_CLAIMED");
  const pending = await prisma.companyClaim.findFirst({ where: { userId: me.id, status: "PENDING" } });
  if (pending) throw conflict("Une demande est déjà en cours de vérification.", "CLAIM_PENDING");
  const claim = await prisma.companyClaim.create({
    data: { userId: me.id, companyId: company.id, taxId: body.taxId, rne: body.rne ?? null },
  });
  res.status(201).json({ claim: { id: claim.id, status: claim.status } });
});

companyRouter.use(requireValidatedCompany);

companyRouter.get("/dashboard", async (req, res) => {
  const companyId = currentCompanyId(req);
  const [company, offers, views, reviews, replies, rating] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { id: true, name: true, city: true, sector: true, description: true, status: true },
    }),
    prisma.offer.count({ where: { companyId, active: true } }),
    prisma.offer.aggregate({ where: { companyId }, _sum: { views: true } }),
    prisma.review.count({ where: { companyId, status: "PUBLISHED" } }),
    prisma.reviewReply.count({ where: { companyId } }),
    companyRating(companyId),
  ]);
  res.json({
    company,
    stats: { activeOffers: offers, offerViews: views._sum.views ?? 0, reviews, replies, rating },
  });
});

companyRouter.patch("/profile", async (req, res) => {
  const companyId = currentCompanyId(req);
  const body = z
    .object({
      description: z.string().trim().max(2000).optional(),
      city: z.string().trim().min(2).max(80).optional(),
      sector: z.string().trim().min(2).max(80).optional(),
    })
    .parse(req.body);
  const company = await prisma.company.update({ where: { id: companyId }, data: body });
  res.json({ company });
});

companyRouter.get("/offers", async (req, res) => {
  const companyId = currentCompanyId(req);
  const q = paginationSchema.parse(req.query);
  const where = { companyId };
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
      })),
      total,
      q,
    ),
  );
});

companyRouter.post("/offers", async (req, res) => {
  const me = currentUser(req);
  const companyId = currentCompanyId(req);
  const body = offerBody.and(z.object({ requestSponsoring: z.boolean().default(false) })).parse(req.body);
  const { requestSponsoring, ...data } = body;
  // Sponsoring is granted by the admin (free during the beta), never self-activated.
  const offer = await prisma.offer.create({
    data: {
      ...data,
      applicationUrl: data.applicationMode === "LINK" ? data.applicationUrl! : null,
      applicationEmail: data.applicationMode === "EMAIL" ? data.applicationEmail! : null,
      companyId,
      sponsorRequested: requestSponsoring,
      createdById: me.id,
    },
    include: offerInclude,
  });
  res.status(201).json({ offer: serializeOffer(offer) });
});

async function ownOffer(id: string, companyId: string) {
  const offer = await prisma.offer.findUnique({ where: { id } });
  if (!offer) throw notFound("Offre introuvable.");
  if (offer.companyId !== companyId) throw forbidden();
  return offer;
}

companyRouter.patch("/offers/:id", async (req, res) => {
  const companyId = currentCompanyId(req);
  const offer = await ownOffer(String(req.params.id), companyId);
  const body = z
    .object({
      title: z.string().trim().min(3).max(150),
      description: z.string().trim().min(20).max(8000),
      city: z.string().trim().min(2).max(80),
      domain: z.string().trim().min(2).max(60),
      type: z.enum(["PFE", "SUMMER"]),
      active: z.boolean(),
      requestSponsoring: z.boolean(),
    })
    .partial()
    .parse(req.body);
  const { requestSponsoring, ...data } = body;
  if (Object.keys(body).length === 0) throw badRequest("Aucune modification.");
  const updated = await prisma.offer.update({
    where: { id: offer.id },
    data: { ...data, ...(requestSponsoring !== undefined ? { sponsorRequested: requestSponsoring } : {}) },
    include: offerInclude,
  });
  res.json({ offer: serializeOffer(updated) });
});

/** Reviews about the company. Read-only + reply + report (see /api/reviews). */
companyRouter.get("/reviews", async (req, res) => {
  const me = currentUser(req);
  const companyId = currentCompanyId(req);
  const q = paginationSchema.parse(req.query);
  const where = { companyId, status: "PUBLISHED" as const };
  const [items, total] = await Promise.all([
    prisma.review.findMany({ where, include: reviewInclude, orderBy: { createdAt: "desc" }, ...toSkipTake(q) }),
    prisma.review.count({ where }),
  ]);
  res.json(paginated(items.map((r) => serializeReview(r, me)), total, q));
});
