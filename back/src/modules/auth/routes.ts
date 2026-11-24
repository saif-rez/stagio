import { Router, type Response } from "express";
import { z } from "zod";
import { OtpPurpose, type User } from "@prisma/client";
import { env } from "../../config/env.js";
import { badRequest, conflict, forbidden, tooMany, unauthorized } from "../../lib/errors.js";
import { signSession, sessionCookieOptions } from "../../lib/jwt.js";
import { generateOtp, hashOtp, otpMatches, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "../../lib/otp.js";
import { getDummyHash, hashPassword, verifyPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { emailDomain, TERMS_VERSION } from "../../lib/rules.js";
import { deleteCertificate } from "../../lib/storage.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { sendOtpEmail } from "../../services/email.js";

export const authRouter = Router();

const email = z.email().trim().toLowerCase().max(254);
const password = z
  .string()
  .min(8, "8 caractères minimum.")
  .max(128)
  .regex(/[A-Za-z]/, "Au moins une lettre.")
  .regex(/\d/, "Au moins un chiffre.");
const name = z.string().trim().min(2).max(100);
const code = z.string().regex(/^\d{6}$/, "Code à 6 chiffres.");
// The CGU and privacy policy must be explicitly accepted at sign-up.
const acceptTerms = z.literal(true, {
  error: "Vous devez accepter les conditions d'utilisation et la politique de confidentialité.",
});
const termsAcceptance = () => ({ termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION });

function publicUser(user: Pick<User, "id" | "email" | "name" | "role" | "emailVerifiedAt" | "companyId">) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: !!user.emailVerifiedAt,
    companyId: user.companyId,
  };
}

async function issueOtp(userId: string, to: string, purpose: OtpPurpose) {
  const otp = generateOtp();
  // Only one active code per purpose.
  await prisma.otpCode.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.otpCode.create({
    data: {
      userId,
      purpose,
      codeHash: hashOtp(otp),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });
  await sendOtpEmail(to, otp, purpose === "VERIFY_EMAIL" ? "verify" : "reset");
}

/** Checks a code: 10 min validity, 5 attempts max, single use. */
async function consumeOtp(userId: string, purpose: OtpPurpose, given: string) {
  const otp = await prisma.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt < new Date())
    throw badRequest("Code expiré. Demandez un nouveau code.", "OTP_EXPIRED");
  if (otp.attempts >= OTP_MAX_ATTEMPTS)
    throw tooMany("Trop de tentatives. Demandez un nouveau code.", "OTP_TOO_MANY_ATTEMPTS");
  if (!otpMatches(given, otp.codeHash)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw badRequest("Code incorrect.", "OTP_INVALID");
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}

function startSession(res: Response, user: Pick<User, "id" | "role">) {
  res.cookie(env.COOKIE_NAME, signSession({ sub: user.id, role: user.role }), sessionCookieOptions());
}

// --- Student sign-up: institutional email only. Account active and signed in immediately. ---
authRouter.post("/register/student", authLimiter, async (req, res) => {
  const body = z.object({ name, email, password, acceptTerms }).parse(req.body);
  const establishment = await prisma.establishment.findUnique({
    where: { emailDomain: emailDomain(body.email) },
  });
  if (!establishment)
    throw badRequest(
      "Utilisez votre adresse universitaire (@isgb.ucar.tn).",
      "INSTITUTIONAL_EMAIL_REQUIRED",
    );
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw conflict("Un compte existe déjà avec cette adresse.", "EMAIL_TAKEN");
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role: "STUDENT",
      ...termsAcceptance(),
      // No email verification step (product decision): the account is active right away.
      emailVerifiedAt: new Date(),
      establishmentId: establishment.id,
    },
  });
  startSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

// --- Company sign-up: creates (or claims) a company page, pending admin validation ---
authRouter.post("/register/company", authLimiter, async (req, res) => {
  const body = z
    .object({
      name,
      email,
      password,
      taxId: z.string().trim().min(4).max(50),
      rne: z.string().trim().max(50).optional(),
      acceptTerms,
      claimCompanyId: z.string().optional(),
      company: z
        .object({
          name: z.string().trim().min(2).max(120),
          city: z.string().trim().min(2).max(80),
          sector: z.string().trim().min(2).max(80),
          description: z.string().trim().max(2000).optional(),
        })
        .optional(),
    })
    .refine((b) => !!b.claimCompanyId !== !!b.company, {
      message: "Revendiquez une fiche existante OU créez une nouvelle fiche.",
    })
    .parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw conflict("Un compte existe déjà avec cette adresse.", "EMAIL_TAKEN");

  const user = await prisma.$transaction(async (tx) => {
    let companyId = body.claimCompanyId;
    if (companyId) {
      const company = await tx.company.findUnique({ where: { id: companyId }, include: { owner: true } });
      if (!company || company.status !== "ACTIVE") throw badRequest("Fiche entreprise introuvable.");
      if (company.owner) throw conflict("Cette fiche est déjà gérée par un compte.", "ALREADY_CLAIMED");
    } else {
      const created = await tx.company.create({
        data: { ...body.company!, description: body.company!.description ?? "", status: "PENDING" },
      });
      companyId = created.id;
    }
    const created = await tx.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: "COMPANY",
        ...termsAcceptance(),
        emailVerifiedAt: new Date(),
      },
    });
    await tx.companyClaim.create({
      data: { userId: created.id, companyId, taxId: body.taxId, rne: body.rne ?? null },
    });
    return created;
  });
  // Signed in right away; company tools stay locked until the admin validates the claim.
  startSession(res, user);
  res.status(201).json({ user: publicUser(user), accountStatus: "PENDING" });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(128) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), body.password);
  if (!user || !valid) throw unauthorized("Email ou mot de passe incorrect.");
  // Accounts created before email verification was removed are activated at first login.
  const active = user.emailVerifiedAt
    ? user
    : await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  startSession(res, active);
  res.json({ user: publicUser(active) });
});

authRouter.post("/logout", (_req, res) => {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(env.COOKIE_NAME, options);
  res.status(204).end();
});

authRouter.post("/password/forgot", authLimiter, async (req, res) => {
  const body = z.object({ email }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (user) await issueOtp(user.id, user.email, "RESET_PASSWORD");
  res.json({ ok: true });
});

authRouter.post("/password/reset", authLimiter, async (req, res) => {
  const body = z.object({ email, code, password }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw badRequest("Code incorrect.", "OTP_INVALID");
  await consumeOtp(user.id, "RESET_PASSWORD", body.code);
  await prisma.user.update({
    where: { id: user.id },
    // Resetting with an emailed code also proves the email address.
    data: { passwordHash: await hashPassword(body.password), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
  });
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const me = currentUser(req);
  const [claim, unread] = await Promise.all([
    me.role === "COMPANY"
      ? prisma.companyClaim.findFirst({
          where: { userId: me.id },
          orderBy: { createdAt: "desc" },
          select: { status: true, company: { select: { id: true, name: true } } },
        })
      : null,
    prisma.notification.count({ where: { userId: me.id, readAt: null } }),
  ]);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      followedDomains: true,
      digestEnabled: true,
      establishment: { select: { id: true, name: true } },
    },
  });
  res.json({
    user: { ...publicUser(me), ...user },
    // Company account status: En attente / Validé / Refusé.
    ...(claim ? { companyAccount: { status: claim.status, company: claim.company } } : {}),
    unreadNotifications: unread,
  });
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const me = currentUser(req);
  const body = z
    .object({
      name: name.optional(),
      followedDomains: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
      digestEnabled: z.boolean().optional(),
    })
    .parse(req.body);
  const user = await prisma.user.update({ where: { id: me.id }, data: body });
  res.json({ user: { ...publicUser(user), followedDomains: user.followedDomains, digestEnabled: user.digestEnabled } });
});

/**
 * Account deletion: reviews stay online but anonymized, certificates are deleted.
 * Requires the password again.
 */
authRouter.delete("/me", requireAuth, async (req, res) => {
  const me = currentUser(req);
  const body = z.object({ password: z.string().min(1) }).parse(req.body);
  if (me.role === "ADMIN") throw forbidden("Un compte admin ne peut pas être supprimé ici.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(user.passwordHash, body.password)))
    throw unauthorized("Mot de passe incorrect.");
  const internships = await prisma.internship.findMany({
    where: { studentId: me.id },
    select: { certificateKey: true },
  });
  await prisma.$transaction([
    prisma.review.updateMany({ where: { authorId: me.id }, data: { anonymous: true, contactOptIn: false } }),
    prisma.internship.updateMany({ where: { studentId: me.id }, data: { certificateKey: null } }),
    prisma.user.delete({ where: { id: me.id } }),
  ]);
  await Promise.all(internships.map((i) => deleteCertificate(i.certificateKey)));
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(env.COOKIE_NAME, options);
  res.status(204).end();
});
