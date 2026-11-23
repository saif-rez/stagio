// Company ratings come only from published reviews. Sponsoring is never an input here.
import { prisma } from "../../lib/prisma.js";
import { MIN_REVIEWS_FOR_RATING } from "../../lib/rules.js";

export type RatingSummary = {
  count: number;
  /** null below 3 reviews: the UI shows "Pas encore assez d'avis". */
  average: number | null;
  criteria: { supervision: number; atmosphere: number; missions: number } | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Ratings for many companies in one query. Companies without reviews get count 0. */
export async function companyRatings(companyIds?: string[]) {
  const groups = await prisma.review.groupBy({
    by: ["companyId"],
    where: { status: "PUBLISHED", ...(companyIds ? { companyId: { in: companyIds } } : {}) },
    _count: { _all: true },
    _avg: { ratingSupervision: true, ratingAtmosphere: true, ratingMissions: true },
  });
  const map = new Map<string, RatingSummary>();
  for (const id of companyIds ?? []) map.set(id, { count: 0, average: null, criteria: null });
  for (const g of groups) {
    const count = g._count._all;
    if (count < MIN_REVIEWS_FOR_RATING) {
      map.set(g.companyId, { count, average: null, criteria: null });
      continue;
    }
    const supervision = g._avg.ratingSupervision ?? 0;
    const atmosphere = g._avg.ratingAtmosphere ?? 0;
    const missions = g._avg.ratingMissions ?? 0;
    map.set(g.companyId, {
      count,
      average: round1((supervision + atmosphere + missions) / 3),
      criteria: {
        supervision: round1(supervision),
        atmosphere: round1(atmosphere),
        missions: round1(missions),
      },
    });
  }
  return map;
}

export async function companyRating(companyId: string): Promise<RatingSummary> {
  return (await companyRatings([companyId])).get(companyId)!;
}
