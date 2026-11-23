import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";
import type { Role } from "@prisma/client";
import { env, isProd } from "../config/env.js";

export type SessionPayload = { sub: string; role: Role };

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: `${env.JWT_EXPIRES_IN_DAYS}d`,
    algorithm: "HS256",
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded === "string" || typeof decoded.sub !== "string") return null;
    return { sub: decoded.sub, role: decoded["role"] as Role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    // Frontend and API are on different origins in production, which requires SameSite=None + Secure.
    sameSite: isProd ? "none" : "lax",
    maxAge: env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  } satisfies CookieOptions;
}
