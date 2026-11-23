import type { RequestHandler } from "express";
import type { Role, User } from "@prisma/client";
import { env } from "../config/env.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { verifySession } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export type AuthUser = Pick<
  User,
  "id" | "email" | "name" | "role" | "emailVerifiedAt" | "companyId" | "establishmentId"
>;

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  emailVerifiedAt: true,
  companyId: true,
  establishmentId: true,
} as const;

/** Reads the session cookie when present. The user is re-loaded from the DB on every request. */
export const loadSession: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  const session = token ? verifySession(token) : null;
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: userSelect });
    if (user) req.user = user;
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  next(req.user ? undefined : unauthorized());
};

/** Server-side role check, used on every protected route. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };

/** Student with a verified institutional email (needed to review, report, request a contact). */
export const requireVerifiedStudent: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "STUDENT") return next(forbidden());
  if (!req.user.emailVerifiedAt)
    return next(forbidden("Vérifiez votre adresse email pour continuer.", "EMAIL_NOT_VERIFIED"));
  return next();
};

/** Company account validated by the admin and linked to its company page. */
export const requireValidatedCompany: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "COMPANY") return next(forbidden());
  if (!req.user.companyId)
    return next(
      forbidden("Votre compte entreprise est en attente de validation.", "COMPANY_NOT_VALIDATED"),
    );
  return next();
};

/** Narrowing helper for handlers placed behind requireAuth / requireRole. */
export function currentUser(req: { user?: AuthUser }): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

export function currentCompanyId(req: { user?: AuthUser }): string {
  const user = currentUser(req);
  if (!user.companyId) throw forbidden();
  return user.companyId;
}
