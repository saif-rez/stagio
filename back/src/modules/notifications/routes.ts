import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../lib/errors.js";
import { paginated, paginationSchema, toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res) => {
  const me = currentUser(req);
  const q = paginationSchema
    .extend({ unread: z.enum(["true", "false"]).optional() })
    .parse(req.query);
  const where = { userId: me.id, ...(q.unread === "true" ? { readAt: null } : {}) };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(q) }),
    prisma.notification.count({ where }),
  ]);
  res.json(paginated(items, total, q));
});

notificationsRouter.post("/read-all", async (req, res) => {
  const me = currentUser(req);
  await prisma.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

notificationsRouter.post("/:id/read", async (req, res) => {
  const me = currentUser(req);
  const { count } = await prisma.notification.updateMany({
    where: { id: String(req.params.id), userId: me.id },
    data: { readAt: new Date() },
  });
  if (!count) throw notFound("Notification introuvable.");
  res.json({ ok: true });
});
