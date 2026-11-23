import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

/** 6-digit numeric code, cryptographically random. */
export function generateOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Codes are stored as a keyed hash, never in clear text. */
export function hashOtp(code: string) {
  return createHmac("sha256", env.JWT_SECRET).update(`otp:${code}`).digest("hex");
}

export function otpMatches(code: string, hash: string) {
  const a = Buffer.from(hashOtp(code), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
