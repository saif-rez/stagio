import { Router } from "express";
import { z } from "zod";
import { forbidden, notFound } from "../../lib/errors.js";
import { readCertificate, verifySignature } from "../../lib/storage.js";
import { requireRole } from "../../middleware/auth.js";

export const filesRouter = Router();

/** Private certificate download: needs an admin session AND a valid, unexpired signature. */
filesRouter.get("/certificates/:key", requireRole("ADMIN"), async (req, res) => {
  const key = String(req.params.key);
  const { expires, sig } = z.object({ expires: z.string(), sig: z.string() }).parse(req.query);
  if (!verifySignature(key, expires, sig)) throw forbidden("Lien expiré ou invalide.", "INVALID_SIGNATURE");
  const file = await readCertificate(key).catch(() => {
    throw notFound("Fichier introuvable.");
  });
  res.set({
    "Content-Type": file.mime,
    "Content-Disposition": "inline",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.send(file.buffer);
});
