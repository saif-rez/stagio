import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env, isProd } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";
import { prisma } from "./lib/prisma.js";
import { loadSession } from "./middleware/auth.js";
import { adminRouter } from "./modules/admin/routes.js";
import { authRouter } from "./modules/auth/routes.js";
import { companiesRouter } from "./modules/companies/routes.js";
import { companyRouter } from "./modules/company/routes.js";
import { contactsRouter } from "./modules/contacts/routes.js";
import { filesRouter } from "./modules/files/routes.js";
import { internshipsRouter } from "./modules/internships/routes.js";
import { notificationsRouter } from "./modules/notifications/routes.js";
import { offersRouter } from "./modules/offers/routes.js";
import { reviewsRouter } from "./modules/reviews/routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Needed behind a proxy (Render, Railway, Fly…) for secure cookies and per-IP rate limits.
  if (isProd) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL, // only the Lovable frontend
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(loadSession);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  /** Public counters for the landing page. */
  app.get("/api/stats", async (_req, res) => {
    const [companies, offers, reviews] = await Promise.all([
      prisma.company.count({ where: { status: "ACTIVE" } }),
      prisma.offer.count({ where: { active: true, company: { status: "ACTIVE" } } }),
      prisma.review.count({ where: { status: "PUBLISHED" } }),
    ]);
    res.json({ companies, offers, reviews });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/companies", companiesRouter);
  app.use("/api/offers", offersRouter);
  app.use("/api/internships", internshipsRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/contact-requests", contactsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/company", companyRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/files", filesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
