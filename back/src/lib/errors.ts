import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { ZodError } from "zod";

/** Single error format for the whole API: { error: { code, message } }. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  new AppError(400, code, message);
export const unauthorized = (message = "Authentification requise.") =>
  new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Accès refusé.", code = "FORBIDDEN") =>
  new AppError(403, code, message);
export const notFound = (message = "Ressource introuvable.") =>
  new AppError(404, "NOT_FOUND", message);
export const conflict = (message: string, code = "CONFLICT") => new AppError(409, code, message);
export const tooMany = (message: string, code = "TOO_MANY_REQUESTS") =>
  new AppError(429, code, message);

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound("Route introuvable."));
};

function send(res: Parameters<ErrorRequestHandler>[2], status: number, code: string, message: string, details?: unknown) {
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) return send(res, err.status, err.code, err.message, err.details);
  if (err instanceof ZodError) {
    return send(
      res,
      400,
      "VALIDATION_ERROR",
      "Données invalides.",
      err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  if (err instanceof multer.MulterError) return send(res, 400, "UPLOAD_ERROR", err.message);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return send(res, 409, "CONFLICT", "Cette ressource existe déjà.");
    if (err.code === "P2025") return send(res, 404, "NOT_FOUND", "Ressource introuvable.");
  }
  if (err?.type === "entity.parse.failed") return send(res, 400, "INVALID_JSON", "Corps JSON invalide.");
  if (err?.type === "entity.too.large") return send(res, 413, "PAYLOAD_TOO_LARGE", "Requête trop volumineuse.");
  console.error(err);
  return send(res, 500, "INTERNAL_ERROR", "Une erreur est survenue.");
};
