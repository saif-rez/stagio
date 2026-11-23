import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { notFound } from "../../lib/errors.js";
import { paginated, paginationSchema, toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { serializeOffer, offerInclude } from "../offers/serialize.js";
import { reviewInclude, serializeReview } from "../reviews/serialize.js";
import { companyRating, companyRatings } from "./ratings.js";

export const companiesRouter = Router();

const publicCompanySelect = {
  id: true,
  name: true,
  city: true,
  sector: true,
  description: true,
  owner: { select: { id: true } },
} satisfies Prisma.CompanySelect;

type PublicCompany = Prisma.CompanyGetPayload<{ select: typeof publicCompanySelect }>;

function serializeCompany(c: PublicCompany) {
  const { owner, ...rest } = c;
  // "claimed" = managed by a validated company account (can reply to reviews).
  return { ...rest, claimed: !!owner };
}

companiesRouter.get("/", async (req, res) => {
  const q = paginationSchema
    .extend({
      search: z.string().trim().max(100).optional(),
      city: z.string().trim().max(80).optional(),
      sector: z.string().trim().max(80).optional(),
    })
    .parse(req.query);
  const where: Prisma.CompanyWhereInput = {
    status: "ACTIVE",
    ...(q.city ? { city: { equals: q.city, mode: "insensitive" } } : {}),
    ...(q.sector ? { sector: { contains: q.sector, mode: "insensitive" } } : {}),
    ...(q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: "insensitive" } },
            { sector: { contains: q.search, mode: "insensitive" } },
            { city: { contains: q.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.company.findMany({ where, select: publicCompanySelect, orderBy: { name: "asc" }, ...toSkipTake(q) }),
    prisma.company.count({ where }),
  ]);
  const ratings = await companyRatings(items.map((c) => c.id));
  res.json(
    paginated(
      items.map((c) => ({ ...serializeCompany(c), rating: ratings.get(c.id) })),
      total,
      q,
    ),
  );
});

companiesRouter.get("/:id", async (req, res) => {
  const company = await prisma.company.findFirst({
    where: { id: req.params.id, status: "ACTIVE" },
    select: publicCompanySelect,
  });
  if (!company) throw notFound("Entreprise introuvable.");
  const [rating, offers] = await Promise.all([
    companyRating(company.id),
    prisma.offer.findMany({
      where: { companyId: company.id, active: true },
      include: offerInclude,
      orderBy: [{ sponsored: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
  ]);
  res.json({
    company: { ...serializeCompany(company), rating },
    offers: offers.map((o) => serializeOffer(o, rating)),
  });
});

companiesRouter.get("/:id/reviews", async (req, res) => {
  const q = paginationSchema.parse(req.query);
  const company = await prisma.company.findFirst({
    where: { id: req.params.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (!company) throw notFound("Entreprise introuvable.");
  const where: Prisma.ReviewWhereInput = { companyId: company.id, status: "PUBLISHED" };
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: reviewInclude,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(q),
    }),
    prisma.review.count({ where }),
  ]);
  res.json(paginated(items.map((r) => serializeReview(r, req.user)), total, q));
});
