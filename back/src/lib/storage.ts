// Private file storage for internship certificates.
// Files live outside any public folder; the admin gets a short-lived HMAC-signed URL.
// Swap this module for Supabase Storage / S3 later without touching the routes.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { badRequest } from "./errors.js";

const root = path.resolve(env.STORAGE_DIR, "certificates");

const signatures: { ext: string; mime: string; magic: number[] }[] = [
  { ext: "pdf", mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  { ext: "png", mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
];

/** Detects the real type from the file content, never from the client-provided name. */
export function detectFileType(buffer: Buffer) {
  return signatures.find((s) => s.magic.every((byte, i) => buffer[i] === byte)) ?? null;
}

function resolveKey(key: string) {
  if (!/^[a-f0-9]{32}\.(pdf|png|jpg)$/.test(key)) throw badRequest("Clé de fichier invalide.");
  return path.join(root, key);
}

export async function saveCertificate(buffer: Buffer) {
  const type = detectFileType(buffer);
  if (!type) throw badRequest("Formats acceptés : PDF, PNG ou JPG.", "INVALID_FILE_TYPE");
  await mkdir(root, { recursive: true });
  const key = `${randomBytes(16).toString("hex")}.${type.ext}`;
  await writeFile(resolveKey(key), buffer, { mode: 0o600 });
  return key;
}

export async function readCertificate(key: string) {
  const buffer = await readFile(resolveKey(key));
  const type = detectFileType(buffer);
  return { buffer, mime: type?.mime ?? "application/octet-stream" };
}

export async function deleteCertificate(key: string | null | undefined) {
  if (!key) return;
  await rm(resolveKey(key), { force: true });
}

function sign(key: string, expires: number) {
  return createHmac("sha256", env.FILE_URL_SECRET).update(`${key}:${expires}`).digest("hex");
}

/** Temporary link, valid SIGNED_URL_TTL_SECONDS. The file route also requires an admin session. */
export function signedCertificateUrl(key: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + env.SIGNED_URL_TTL_SECONDS;
  const url = new URL(`/api/files/certificates/${key}`, env.API_URL);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("sig", sign(key, expires));
  return { url: url.toString(), expiresAt: new Date(expires * 1000).toISOString() };
}

export function verifySignature(key: string, expires: string, sig: string, now = Date.now()) {
  const exp = Number(expires);
  if (!Number.isInteger(exp) || exp * 1000 < now) return false;
  const expected = Buffer.from(sign(key, exp), "hex");
  const given = Buffer.from(sig, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
