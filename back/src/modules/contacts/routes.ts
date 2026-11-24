// "Contacter l'ancien stagiaire": no internal messaging. A request, accepted or refused by the
// former intern, who then shares one contact channel of their choice.
import { Router } from "express";
import { z } from "zod";
import type { ContactRequest, Prisma } from "@prisma/client";
import { badRequest, conflict, forbidden, notFound, tooMany } from "../../lib/errors.js";
import { paginated, paginationSchema, toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import {
  ANONYMOUS_LABEL,
  CONTACT_EXPIRY_DAYS,
  CONTACT_MESSAGE_MAX,
  DAY_MS,
  MAX_CONTACTS_PER_DAY,
  startOfToday,
} from "../../lib/rules.js";
import { currentUser, requireVerifiedStudent } from "../../middleware/auth.js";
import { contactLimiter } from "../../middleware/rateLimit.js";
import { notify } from "../../services/notifications.js";

export const contactsRouter = Router();
contactsRouter.use(requireVerifiedStudent);

const contactInclude = {
  requester: { select: { id: true, name: true } },
  recipient: { select: { id: true, name: true } },
  review: {
    select: {
      id: true,
      anonymous: true,
      company: { select: { id: true, name: true } },
      internship: { select: { year: true, type: true } },
    },
  },
} satisfies Prisma.ContactRequestInclude;

type ContactWithRelations = Prisma.ContactRequestGetPayload<{ include: typeof contactInclude }>;

function serializeContact(c: ContactWithRelations, viewerId: string) {
  const received = c.recipientId === viewerId;
  const accepted = c.status === "ACCEPTED";
  // An anonymous author's identity is only revealed once they accept.
  const recipientName = c.review.anonymous && !accepted ? ANONYMOUS_LABEL : c.recipient.name;
  return {
    id: c.id,
    box: received ? "received" : "sent",
    otherParty: received ? c.requester.name : recipientName,
    review: { id: c.review.id, company: c.review.company, ...c.review.internship },
    message: c.message,
    status: c.status,
    expiresAt: c.expiresAt,
    createdAt: c.createdAt,
    // Both sides see the contact chosen by the former intern once accepted.
    contact: accepted ? { channel: c.channel, value: c.channelValue } : null,
  };
}

/** Pending requests past their 7 days are expired lazily here and by the cron job. */
async function loadOwnContact(id: string, userId: string): Promise<ContactRequest> {
  const c = await prisma.contactRequest.findUnique({ where: { id } });
  if (!c) throw notFound("Demande introuvable.");
  if (c.recipientId !== userId && c.requesterId !== userId) throw forbidden();
  if (c.status === "PENDING" && c.expiresAt < new Date()) {
    return prisma.contactRequest.update({ where: { id }, data: { status: "EXPIRED" } });
  }
  return c;
}

contactsRouter.post("/", contactLimiter, async (req, res) => {
  const me = currentUser(req);
  const { reviewId, message } = z
    .object({ reviewId: z.string().min(1), message: z.string().trim().min(1).max(CONTACT_MESSAGE_MAX) })
    .parse(req.body);
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.status !== "PUBLISHED" || !review.contactOptIn || !review.authorId || review.isDemo)
    throw badRequest("Cet(te) ancien(ne) stagiaire n'accepte pas les demandes de contact.", "CONTACT_NOT_ALLOWED");
  if (review.authorId === me.id) throw badRequest("Vous ne pouvez pas vous contacter vous-même.");

  const sentToday = await prisma.contactRequest.count({
    where: { requesterId: me.id, createdAt: { gte: startOfToday() } },
  });
  if (sentToday >= MAX_CONTACTS_PER_DAY)
    throw tooMany(`Limite atteinte : ${MAX_CONTACTS_PER_DAY} demandes de contact par jour.`, "CONTACT_DAILY_LIMIT");
  const pending = await prisma.contactRequest.findFirst({
    where: { requesterId: me.id, reviewId: review.id, status: { in: ["PENDING", "ACCEPTED"] } },
  });
  if (pending) throw conflict("Vous avez déjà une demande en cours pour cet avis.", "CONTACT_EXISTS");

  const created = await prisma.contactRequest.create({
    data: {
      reviewId: review.id,
      requesterId: me.id,
      recipientId: review.authorId,
      message,
      expiresAt: new Date(Date.now() + CONTACT_EXPIRY_DAYS * DAY_MS),
    },
    include: contactInclude,
  });
  await notify({
    userId: review.authorId,
    type: "CONTACT_REQUEST_RECEIVED",
    title: "Nouvelle demande de contact",
    body: `${me.name} souhaite échanger avec vous à propos de votre stage. Vous avez ${CONTACT_EXPIRY_DAYS} jours pour répondre.`,
    link: "/profil",
  });
  res.status(201).json({ request: serializeContact(created, me.id) });
});

contactsRouter.get("/", async (req, res) => {
  const me = currentUser(req);
  const q = paginationSchema
    .extend({ box: z.enum(["received", "sent"]).default("received") })
    .parse(req.query);
  // Expire overdue requests before listing.
  await prisma.contactRequest.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  const where: Prisma.ContactRequestWhereInput =
    q.box === "received" ? { recipientId: me.id } : { requesterId: me.id };
  const [items, total] = await Promise.all([
    prisma.contactRequest.findMany({
      where,
      include: contactInclude,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(q),
    }),
    prisma.contactRequest.count({ where }),
  ]);
  res.json(paginated(items.map((c) => serializeContact(c, me.id)), total, q));
});

const acceptBody = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("EMAIL"), value: z.email().max(254) }),
  z.object({
    channel: z.literal("LINKEDIN"),
    value: z.url().max(300).refine((u) => /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(u), "Lien LinkedIn invalide."),
  }),
  z.object({
    channel: z.literal("WHATSAPP"),
    value: z.string().trim().regex(/^\+?[0-9 ]{8,20}$/, "Numéro WhatsApp invalide."),
  }),
]);

contactsRouter.post("/:id/accept", async (req, res) => {
  const me = currentUser(req);
  const body = acceptBody.parse(req.body);
  const c = await loadOwnContact(String(req.params.id), me.id);
  if (c.recipientId !== me.id) throw forbidden();
  if (c.status !== "PENDING") throw conflict("Cette demande n'est plus en attente.", "CONTACT_NOT_PENDING");
  const updated = await prisma.contactRequest.update({
    where: { id: c.id },
    data: { status: "ACCEPTED", channel: body.channel, channelValue: body.value, respondedAt: new Date() },
    include: contactInclude,
  });
  await notify({
    userId: c.requesterId,
    type: "CONTACT_REQUEST_ACCEPTED",
    title: "Demande de contact acceptée",
    body: "L'ancien(ne) stagiaire a accepté votre demande. Ses coordonnées sont visibles dans votre profil.",
    link: "/profil",
  });
  res.json({ request: serializeContact(updated, me.id) });
});

contactsRouter.post("/:id/refuse", async (req, res) => {
  const me = currentUser(req);
  const c = await loadOwnContact(String(req.params.id), me.id);
  if (c.recipientId !== me.id) throw forbidden();
  if (c.status !== "PENDING") throw conflict("Cette demande n'est plus en attente.", "CONTACT_NOT_PENDING");
  const updated = await prisma.contactRequest.update({
    where: { id: c.id },
    data: { status: "REFUSED", respondedAt: new Date() },
    include: contactInclude,
  });
  await notify({
    userId: c.requesterId,
    type: "CONTACT_REQUEST_REFUSED",
    title: "Demande de contact refusée",
    body: "L'ancien(ne) stagiaire n'est pas disponible pour échanger.",
    link: "/profil",
  });
  res.json({ request: serializeContact(updated, me.id) });
});
