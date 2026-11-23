// Public data: companies, offers, latest reviews, counters.
import type { Company, InternshipType, Offer, Paginated, PublicStats, Review } from "@/types";
import { api } from "./client";

export type OfferFilters = {
  search?: string;
  domain?: string;
  type?: InternshipType | "";
  city?: string;
  minRating?: string;
  sort?: "recent" | "rating";
  page?: number;
  limit?: number;
};

export const listOffers = (filters: OfferFilters = {}) =>
  api<Paginated<Offer>>("/offers", { query: filters });

export const getOffer = (id: string) => api<{ offer: Offer }>(`/offers/${id}`);

export const listCompanies = (query: { search?: string; page?: number; limit?: number } = {}) =>
  api<Paginated<Company>>("/companies", { query });

export const getCompany = (id: string) =>
  api<{ company: Company; offers: Offer[] }>(`/companies/${id}`);

export const listCompanyReviews = (id: string, page = 1, limit = 20) =>
  api<Paginated<Review>>(`/companies/${id}/reviews`, { query: { page, limit } });

export const listLatestReviews = (limit = 2) =>
  api<{ items: Review[] }>("/reviews/latest", { query: { limit } });

export const getPublicStats = () => api<PublicStats>("/stats");
