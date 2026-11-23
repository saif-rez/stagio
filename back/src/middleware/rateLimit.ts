import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import { env } from "../config/env.js";

const base = (windowMs: number, limit: number, message: string): Partial<Options> => ({
  windowMs,
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  // Logged-in actions are limited per account, anonymous ones per IP.
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown"),
  handler: (_req, res) => {
    res.status(429).json({ error: { code: "TOO_MANY_REQUESTS", message } });
  },
});

/** Login, sign-up, OTP and password reset. */
export const authLimiter = rateLimit(
  base(15 * 60 * 1000, env.AUTH_RATE_LIMIT, "Trop de tentatives. Réessayez dans quelques minutes."),
);

/** Review creation and edition. */
export const reviewLimiter = rateLimit(
  base(60 * 60 * 1000, 10, "Trop d'avis envoyés. Réessayez plus tard."),
);

/** Contact requests (the 5/day business rule is enforced separately in the database). */
export const contactLimiter = rateLimit(
  base(60 * 60 * 1000, 10, "Trop de demandes de contact. Réessayez plus tard."),
);

/** Reports. */
export const reportLimiter = rateLimit(
  base(60 * 60 * 1000, 20, "Trop de signalements. Réessayez plus tard."),
);
