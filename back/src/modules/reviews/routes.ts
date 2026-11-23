import { Router } from "express";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { AUTO_HIDE_REPORTS, moderateText } from "../../lib/rules.js";
import {
  currentUser,
  requireAuth,
  requireValidatedCompany,
  requireVerifiedStudent,
} from "../../middleware/auth.js";
import { reportLimiter, reviewLimiter } from "../../middleware/rateLimit.js";
import { notify } from "../../services/notifications.js";
import { reviewBody } from "../internships/routes.js";
import { reviewInclude, serializeReview } from "./serialize.js";

export const reviewsRouter = Router();

/** Latest published reviews (landing page). */
reviewsRouter.get("/latest", async (req, res) => {
  const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(12).default(4) }).parse(req.query);
  const items = await prisma.review.findMany({
    where: { status: "PUBLISHED", company: { status: "ACTIVE" } },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json({ items: items.map((r) => serializeReview(r, req.user)) });
});

reviewsRouter.get("/me", requireVerifiedStudent, async (req, res) => {
  const me = currentUser(req);
  const items = await prisma.review.findMany({
    where: { authorId: me.id },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ items: items.map((r) => serializeReview(r, me)) });
});

/** The author edits their review (e.g. after a modification request from the admin). */
reviewsRouter.patch("/:id", requireVerifiedStudent, reviewLimiter, async (req, res) => {
  const me = currentUser(req);
  const review = await prisma.review.findUnique({ where: { id: String(req.params.id) } });
  if (!review) throw notFound("Avis introuvable.");
  if (review.authorId !== me.id) throw forbidden();
  if (review.status === "REMOVED" || review.status === "HIDDEN")
    throw conflict("Cet avis est en cours de modération.", "REVIEW_LOCKED");
  const body = reviewBody.partial().parse(req.body);
  if (body.comment) {
    const blocked = moderateText(body.comment);
    if (blocked) throw badRequest(blocked, "CONTENT_BLOCKED");
  }
  const updated = await prisma.review.update({
    where: { id: review.id },
    data: {
      ...(body.ratings
        ? {
            ratingSupervision: body.ratings.supervision,
            ratingAtmosphere: body.ratings.atmosphere,
            ratingMissions: body.ratings.missions,
          }
        : {}),
      ...(body.comment !== undefined ? { comment: body.comment } : {}),
      ...(body.anonymous !== undefined ? { anonymous: body.anonymous } : {}),
      ...(body.contactOptIn !== undefined ? { contactOptIn: body.contactOptIn } : {}),
      // A requested change, once made, puts the review back online.
      ...(review.status === "CHANGES_REQUESTED" ? { status: "PUBLISHED" } : {}),
    },
    include: reviewInclude,
  });
  res.json({ review: serializeReview(updated, me) });
});

/**
 * Report a review (verified student, or the company the review is about).
 * Auto-hidden at 3 reports, waiting for the admin.
 */
reviewsRouter.post("/:id/reports", requireAuth, reportLimiter, async (req, res) => {
  const me = currentUser(req);
  const { reason } = z
    .object({ reason: z.enum(["FAKE_REVIEW", "INSULTS", "PERSONAL_DATA", "OFF_TOPIC"]) })
    .parse(req.body);
  const review = await prisma.review.findUnique({ where: { id: String(req.params.id) } });
  if (!review || review.status !== "PUBLISHED") throw notFound("Avis introuvable.");

  if (me.role === "STUDENT") {
    if (!me.emailVerifiedAt)
      throw forbidden("Vérifiez votre adresse email pour continuer.", "EMAIL_NOT_VERIFIED");
    if (review.authorId === me.id) throw badRequest("Vous ne pouvez pas signaler votre propre avis.");
  } else if (me.role === "COMPANY") {
    if (!me.companyId || me.companyId !== review.companyId) throw forbidden();
  } else {
    throw forbidden("Utilisez la modération admin.");
  }

  const already = await prisma.report.findUnique({
    where: { reviewId_reporterId: { reviewId: review.id, reporterId: me.id } },
  });
  if (already) throw conflict("Vous avez déjà signalé cet avis.", "ALREADY_REPORTED");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.report.create({
      data: { reviewId: review.id, reporterId: me.id, companyId: me.companyId, reason },
    });
    const r = await tx.review.update({
      where: { id: review.id },
      data: { reportCount: { increment: 1 } },
    });
    if (r.reportCount >= AUTO_HIDE_REPORTS && r.status === "PUBLISHED") {
      return tx.review.update({ where: { id: r.id }, data: { status: "HIDDEN" } });
    }
    return r;
  });
  if (updated.status === "HIDDEN" && updated.authorId) {
    await notify({
      userId: updated.authorId,
      type: "REVIEW_HIDDEN",
      title: "Votre avis a été masqué",
      body: "Votre avis a reçu plusieurs signalements. Il est masqué en attendant la décision de la modération.",
      link: "/profil",
    });
  }
  res.status(201).json({ ok: true });
});

/** Single public reply of the company to a review. No edit, no delete of the review itself. */
reviewsRouter.post("/:id/reply", requireValidatedCompany, async (req, res) => {
  const me = currentUser(req);
  const { body } = z.object({ body: z.string().trim().min(2).max(2000) }).parse(req.body);
  const review = await prisma.review.findUnique({
    where: { id: String(req.params.id) },
    include: { reply: true },
  });
  if (!review || review.status !== "PUBLISHED") throw notFound("Avis introuvable.");
  if (review.companyId !== me.companyId) throw forbidden();
  if (review.reply) throw conflict("Une seule réponse est autorisée par avis.", "REPLY_EXISTS");
  const blocked = moderateText(body);
  if (blocked) throw badRequest(blocked, "CONTENT_BLOCKED");
  await prisma.reviewReply.create({ data: { reviewId: review.id, companyId: review.companyId, body } });
  if (review.authorId) {
    await notify({
      userId: review.authorId,
      type: "REVIEW_REPLY",
      title: "Une entreprise a répondu à votre avis",
      body: "Consultez la réponse publique publiée sous votre avis.",
      link: "/profil",
    });
  }
  const full = await prisma.review.findUniqueOrThrow({ where: { id: review.id }, include: reviewInclude });
  res.status(201).json({ review: serializeReview(full, me) });
});
