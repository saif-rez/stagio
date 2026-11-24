import type { Prisma } from "@prisma/client";
import type { RatingSummary } from "../companies/ratings.js";

export const offerInclude = {
  company: { select: { id: true, name: true, city: true, sector: true } },
} satisfies Prisma.OfferInclude;

export type OfferWithCompany = Prisma.OfferGetPayload<{ include: typeof offerInclude }>;

export function isSponsoredNow(offer: { sponsored: boolean; sponsoredUntil: Date | null }, now = new Date()) {
  return offer.sponsored && (!offer.sponsoredUntil || offer.sponsoredUntil > now);
}

/** Where the "Postuler" button goes: external link, or the mail client with a pre-filled subject. */
export function applyTarget(offer: OfferWithCompany) {
  // Demonstration offers cannot be applied to.
  if (offer.isDemo) return { mode: "LINK" as const, url: null };
  if (offer.applicationMode === "EMAIL" && offer.applicationEmail) {
    const subject = encodeURIComponent(`Candidature – ${offer.title} (Stagio)`);
    return { mode: "EMAIL" as const, url: `mailto:${offer.applicationEmail}?subject=${subject}` };
  }
  return { mode: "LINK" as const, url: offer.applicationUrl ?? offer.sourceUrl ?? null };
}

export function serializeOffer(offer: OfferWithCompany, rating?: RatingSummary) {
  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    company: offer.company,
    city: offer.city,
    type: offer.type,
    domain: offer.domain,
    sponsored: isSponsoredNow(offer),
    /** Demonstration offer: labelled on the site, no "Postuler" button. */
    demo: offer.isDemo,
    source: offer.sourceName || offer.sourceUrl ? { name: offer.sourceName, url: offer.sourceUrl } : null,
    apply: applyTarget(offer),
    companyRating: rating ?? null,
    publishedAt: offer.createdAt,
  };
}
