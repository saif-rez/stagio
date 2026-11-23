// Public shape of a review. Privacy rules live here, in one place:
// - the author of an anonymous review is only sent to the admin;
// - only the internship year is exposed, never exact dates.
import type { Prisma } from "@prisma/client";
import { ANONYMOUS_LABEL } from "../../lib/rules.js";
import type { AuthUser } from "../../middleware/auth.js";

export const reviewInclude = {
  internship: { select: { year: true, type: true, domain: true, status: true } },
  author: { select: { id: true, name: true, email: true } },
  reply: { select: { body: true, createdAt: true } },
  company: { select: { id: true, name: true, city: true, sector: true } },
} satisfies Prisma.ReviewInclude;

export type ReviewWithRelations = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

export function serializeReview(review: ReviewWithRelations, viewer?: AuthUser) {
  const isAdmin = viewer?.role === "ADMIN";
  const isMine = !!viewer && review.authorId === viewer.id;
  const showName = !review.anonymous && !!review.author;
  return {
    id: review.id,
    company: review.company,
    authorName: showName ? review.author!.name : ANONYMOUS_LABEL,
    anonymous: review.anonymous || !review.author,
    year: review.internship.year,
    type: review.internship.type,
    domain: review.internship.domain,
    ratings: {
      supervision: review.ratingSupervision,
      atmosphere: review.ratingAtmosphere,
      missions: review.ratingMissions,
    },
    comment: review.comment,
    contactOptIn: review.contactOptIn && !!review.author,
    badges: {
      // Every review comes from a student verified by institutional email.
      verifiedReview: true,
      // Certificate checked by the admin.
      verifiedInternship: review.internship.status === "VERIFIED",
    },
    reply: review.reply ? { body: review.reply.body } : null,
    isMine,
    // Fields below are only for the author or the admin.
    ...(isMine || isAdmin ? { status: review.status } : {}),
    ...(isAdmin
      ? {
          admin: {
            author: review.author,
            reportCount: review.reportCount,
            createdAt: review.createdAt,
          },
        }
      : {}),
  };
}
