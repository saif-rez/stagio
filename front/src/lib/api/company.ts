// Company workspace.
import type { CompanyDashboard, Offer, OfferInput, Paginated, Review } from "@/types";
import { api } from "./client";

export const getCompanyDashboard = () => api<CompanyDashboard>("/company/dashboard");

export const listCompanyOffers = () =>
  api<Paginated<Offer>>("/company/offers", { query: { limit: 100 } });

export const createCompanyOffer = (body: OfferInput & { requestSponsoring: boolean }) =>
  api<{ offer: Offer }>("/company/offers", { method: "POST", body });

export const updateCompanyOffer = (
  id: string,
  body: { active?: boolean; requestSponsoring?: boolean },
) => api<{ offer: Offer }>(`/company/offers/${id}`, { method: "PATCH", body });

export const listReceivedReviews = (page = 1) =>
  api<Paginated<Review>>("/company/reviews", { query: { page, limit: 50 } });

/** Single public reply per review. */
export const replyToReview = (reviewId: string, body: string) =>
  api<{ review: Review }>(`/reviews/${reviewId}/reply`, { method: "POST", body: { body } });

export const claimCompany = (body: { companyId: string; taxId: string; rne?: string }) =>
  api<{ claim: { id: string; status: string } }>("/company/claims", { method: "POST", body });
