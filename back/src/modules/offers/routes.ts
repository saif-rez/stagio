import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { notFound } from "../../lib/errors.js";
import { paginated, paginationSchema, toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { companyRating, companyRatings } from "../companies/ratings.js";
import { offerInclude, serializeOffer } from "./serialize.js";

export const offersRouter = Router();

const listQuery = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  domain: z.string().trim().max(60).optional(),
  type: z.enum(["PFE", "SUMMER"]).optional(),
  city: z.string().trim().max(80).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(["recent", "rating"]).default("recent"),
});

/** Public offer list: sponsored offers first (badge "Sponsorisé"), then the chosen sort. */
offersRouter.get("/", async (req, res) => {
  const q = listQuery.parse(req.query);
  const now = new Date();
  const where: Prisma.OfferWhereInput = {
    active: true,
    company: { status: "ACTIVE" },
    ...(q.domain ? { domain: q.domain } : {}),
    ...(q.type ? { type: q.type } : {}),
    ...(q.city ? { city: { equals: q.city, mode: "insensitive" } } : {}),
    ...(q.search
      ? {
          OR: [
            { title: { contains: q.search, mode: "insensitive" } },
            { description: { contains: q.search, mode: "insensitive" } },
            { company: { name: { contains: q.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  // Rating filter/sort need every company's rating (small data set at MVP scale).
  const ratings = q.minRating !== undefined || q.sort === "rating" ? await companyRatings() : null;
  if (ratings && q.minRating !== undefined) {
    const eligible = [...ratings].filter(([, r]) => r.average !== null && r.average >= q.minRating!);
    where.companyId = { in: eligible.map(([id]) => id) };
  }

  const sponsoredFirst = (o: { sponsored: boolean; sponsoredUntil: Date | null }) =>
    o.sponsored && (!o.sponsoredUntil || o.sponsoredUntil > now) ? 1 : 0;

  let items;
  let total;
  if (q.sort === "rating") {
    const all = await prisma.offer.findMany({ where, include: offerInclude });
    all.sort(
      (a, b) =>
        sponsoredFirst(b) - sponsoredFirst(a) ||
        (ratings!.get(b.companyId)?.average ?? 0) - (ratings!.get(a.companyId)?.average ?? 0) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
    total = all.length;
    const { skip, take } = toSkipTake(q);
    items = all.slice(skip, skip + take);
  } else {
    // Expired sponsorships are switched off hourly by the cron job, so `sponsored` is reliable here.
    [items, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: offerInclude,
        orderBy: [{ sponsored: "desc" }, { createdAt: "desc" }],
        ...toSkipTake(q),
      }),
      prisma.offer.count({ where }),
    ]);
  }
  const pageRatings = ratings ?? (await companyRatings([...new Set(items.map((o) => o.companyId))]));
  res.json(
    paginated(
      items.map((o) => serializeOffer(o, pageRatings.get(o.companyId))),
      total,
      q,
    ),
  );
});

offersRouter.get("/:id", async (req, res) => {
  const offer = await prisma.offer.findFirst({
    where: { id: req.params.id, active: true, company: { status: "ACTIVE" } },
    include: offerInclude,
  });
  if (!offer) throw notFound("Offre introuvable.");
  // View counter for the company dashboard.
  await prisma.offer.update({ where: { id: offer.id }, data: { views: { increment: 1 } } });
  res.json({ offer: serializeOffer(offer, await companyRating(offer.companyId)) });
});
