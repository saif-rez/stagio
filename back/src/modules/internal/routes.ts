// Scheduled jobs triggered from outside (cron-job.org, GitHub Actions…), for hosts where the
// server sleeps (Render free plan) and in-process node-cron cannot run reliably.
// Protected by CRON_SECRET: `Authorization: Bearer <CRON_SECRET>`.
import { createHash, timingSafeEqual } from "node:crypto";
import { Router, type RequestHandler } from "express";
import { env } from "../../config/env.js";
import { notFound, unauthorized } from "../../lib/errors.js";
import { endExpiredSponsoring, expireContactRequests, sendNewOffersDigest } from "../../jobs/cron.js";

export const internalRouter = Router();

const digest = (s: string) => createHash("sha256").update(s).digest();

const requireCronSecret: RequestHandler = (req, _res, next) => {
  // Disabled unless a secret is configured: the endpoint then looks like any unknown route.
  if (!env.CRON_SECRET) return next(notFound("Route introuvable."));
  const header = req.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Compare hashes so lengths always match (constant time).
  return next(timingSafeEqual(digest(given), digest(env.CRON_SECRET)) ? undefined : unauthorized());
};

/** Hourly: expire 7-day-old contact requests, end 7/30-day sponsoring. */
internalRouter.post("/cron/hourly", requireCronSecret, async (_req, res) => {
  const [expiredContacts, endedSponsoring] = await Promise.all([
    expireContactRequests(),
    endExpiredSponsoring(),
  ]);
  res.json({ expiredContacts, endedSponsoring });
});

/** Daily: new offers digest (at most once a day per student, enforced in the job). */
internalRouter.post("/cron/digest", requireCronSecret, async (_req, res) => {
  res.json({ digestsSent: await sendNewOffersDigest() });
});
