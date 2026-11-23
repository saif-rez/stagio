import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../../config/env.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { moderateText } from "../../lib/rules.js";
import { deleteCertificate, saveCertificate } from "../../lib/storage.js";
import { currentUser, requireVerifiedStudent } from "../../middleware/auth.js";
import { reviewLimiter } from "../../middleware/rateLimit.js";
import { notifyCompanyOwner } from "../../services/notifications.js";
import { reviewInclude, serializeReview } from "../reviews/serialize.js";

export const internshipsRouter = Router();
internshipsRouter.use(requireVerifiedStudent);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});

const currentYear = () => new Date().getFullYear();

export const reviewBody = z.object({
  ratings: z.object({
    supervision: z.number().int().min(1).max(5),
    atmosphere: z.number().int().min(1).max(5),
    missions: z.number().int().min(1).max(5),
  }),
  comment: z.string().trim().min(20, "20 caractères minimum.").max(3000),
  anonymous: z.boolean().default(false),
  contactOptIn: z.boolean().default(false),
});

async function ownInternship(id: string, studentId: string) {
  const internship = await prisma.internship.findUnique({ where: { id } });
  if (!internship) throw notFound("Stage introuvable.");
  if (internship.studentId !== studentId) throw forbidden();
  return internship;
}

internshipsRouter.get("/me", async (req, res) => {
  const me = currentUser(req);
  const items = await prisma.internship.findMany({
    where: { studentId: me.id },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: {
      company: { select: { id: true, name: true, city: true, sector: true, status: true } },
      review: { include: reviewInclude },
    },
  });
  res.json({
    items: items.map(({ certificateKey, review, ...i }) => ({
      ...i,
      hasCertificate: !!certificateKey,
      review: review ? serializeReview(review, me) : null,
    })),
  });
});

/** Declare an internship, on an existing company page or by proposing a new company. */
internshipsRouter.post("/", async (req, res) => {
  const me = currentUser(req);
  const body = z
    .object({
      companyId: z.string().optional(),
      proposedCompany: z
        .object({
          name: z.string().trim().min(2).max(120),
          city: z.string().trim().min(2).max(80),
          sector: z.string().trim().min(2).max(80),
        })
        .optional(),
      year: z.number().int().min(2000).max(currentYear()),
      type: z.enum(["PFE", "SUMMER"]),
      domain: z.string().trim().min(2).max(60),
    })
    .refine((b) => !!b.companyId !== !!b.proposedCompany, {
      message: "Choisissez une entreprise existante OU proposez-en une.",
    })
    .parse(req.body);
  if (!me.establishmentId) throw forbidden("Compte étudiant sans établissement.");

  let companyId = body.companyId;
  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    // Pending pages are allowed only for the student who proposed them.
    if (!company || company.status === "REFUSED" || (company.status === "PENDING" && company.proposedById !== me.id))
      throw badRequest("Entreprise introuvable.");
  } else {
    // Proposed companies wait for admin validation (anti-duplicates, anti-fake names).
    const created = await prisma.company.create({
      data: { ...body.proposedCompany!, status: "PENDING", proposedById: me.id },
    });
    companyId = created.id;
  }
  const duplicate = await prisma.internship.findFirst({
    where: { studentId: me.id, companyId, year: body.year, type: body.type },
  });
  if (duplicate) throw conflict("Vous avez déjà déclaré ce stage.", "INTERNSHIP_EXISTS");
  const internship = await prisma.internship.create({
    data: {
      studentId: me.id,
      companyId,
      establishmentId: me.establishmentId,
      year: body.year,
      type: body.type,
      domain: body.domain,
    },
    include: { company: { select: { id: true, name: true, status: true } } },
  });
  const { certificateKey: _key, ...rest } = internship;
  res.status(201).json({ internship: { ...rest, hasCertificate: false } });
});

/** Upload the internship certificate (PDF/PNG/JPG). Stored privately, checked by the admin. */
internshipsRouter.post("/:id/certificate", upload.single("file"), async (req, res) => {
  const me = currentUser(req);
  const internship = await ownInternship(String(req.params.id), me.id);
  if (!req.file) throw badRequest("Fichier manquant (champ « file »).");
  if (internship.status === "VERIFIED") throw conflict("Ce stage est déjà vérifié.");
  const key = await saveCertificate(req.file.buffer);
  await prisma.internship.update({
    where: { id: internship.id },
    data: { certificateKey: key, status: "PENDING_VERIFICATION" },
  });
  await deleteCertificate(internship.certificateKey);
  res.json({ status: "PENDING_VERIFICATION" });
});

/** Publish the review of a declared internship. One review per internship. */
internshipsRouter.post("/:id/review", reviewLimiter, async (req, res) => {
  const me = currentUser(req);
  const internship = await ownInternship(String(req.params.id), me.id);
  const body = reviewBody.parse(req.body);
  const blocked = moderateText(body.comment);
  if (blocked) throw badRequest(blocked, "CONTENT_BLOCKED");
  const existing = await prisma.review.findUnique({ where: { internshipId: internship.id } });
  if (existing) throw conflict("Vous avez déjà publié un avis pour ce stage.", "REVIEW_EXISTS");
  // Moderation is a posteriori: the review is published immediately.
  const review = await prisma.review.create({
    data: {
      internshipId: internship.id,
      authorId: me.id,
      companyId: internship.companyId,
      ratingSupervision: body.ratings.supervision,
      ratingAtmosphere: body.ratings.atmosphere,
      ratingMissions: body.ratings.missions,
      comment: body.comment,
      anonymous: body.anonymous,
      contactOptIn: body.contactOptIn,
    },
    include: reviewInclude,
  });
  await notifyCompanyOwner(internship.companyId, {
    type: "NEW_REVIEW",
    title: "Nouvel avis reçu",
    body: "Un(e) étudiant(e) a partagé son expérience de stage dans votre entreprise.",
    link: "/entreprise/avis",
  });
  res.status(201).json({ review: serializeReview(review, me) });
});
