// Back-office (ADMIN role).
import type {
  AdminClaim,
  AdminCompany,
  AdminInternship,
  AdminStats,
  CompanyStatus,
  InternshipStatus,
  Offer,
  OfferInput,
  Paginated,
  Review,
  ReviewStatus,
} from "@/types";
import { api } from "./client";

export const getAdminStats = () => api<AdminStats>("/admin/stats");

export const listClaims = () =>
  api<Paginated<AdminClaim>>("/admin/claims", { query: { status: "PENDING", limit: 100 } });
export const acceptClaim = (id: string) => api(`/admin/claims/${id}/accept`, { method: "POST" });
export const refuseClaim = (id: string) => api(`/admin/claims/${id}/refuse`, { method: "POST" });

export const listAdminCompanies = (query: {
  status?: CompanyStatus;
  proposed?: boolean;
  search?: string;
}) => api<Paginated<AdminCompany>>("/admin/companies", { query: { ...query, limit: 100 } });
export const createCompanyPage = (body: {
  name: string;
  city: string;
  sector: string;
  description?: string;
}) => api<{ company: AdminCompany }>("/admin/companies", { method: "POST", body });
export const approveCompany = (id: string) =>
  api(`/admin/companies/${id}/approve`, { method: "POST" });
export const refuseCompany = (id: string) =>
  api(`/admin/companies/${id}/refuse`, { method: "POST" });
export const mergeCompany = (id: string, targetId: string) =>
  api(`/admin/companies/${id}/merge`, { method: "POST", body: { targetId } });

export const listAdminOffers = (search?: string) =>
  api<Paginated<Offer>>("/admin/offers", { query: { search, limit: 100 } });
export const createExternalOffer = (
  body: OfferInput & { companyId: string; sourceName: string; sourceUrl?: string },
) => api<{ offer: Offer }>("/admin/offers", { method: "POST", body });
export const setSponsoring = (id: string, sponsored: boolean, days?: 7 | 30) =>
  api<{ offer: Offer }>(`/admin/offers/${id}/sponsor`, {
    method: "POST",
    body: { sponsored, ...(days ? { days } : {}) },
  });

export const listAdminInternships = (status: InternshipStatus = "PENDING_VERIFICATION") =>
  api<Paginated<AdminInternship>>("/admin/internships", { query: { status, limit: 100 } });
export const getCertificateUrl = (id: string) =>
  api<{ url: string; expiresAt: string }>(`/admin/internships/${id}/certificate`);
export const verifyInternship = (id: string) =>
  api(`/admin/internships/${id}/verify`, { method: "POST" });
export const rejectInternship = (id: string) =>
  api(`/admin/internships/${id}/reject`, { method: "POST" });

export const listReportedReviews = (status?: ReviewStatus) =>
  api<Paginated<Review>>("/admin/reviews", { query: { status, reported: true, limit: 100 } });
export const moderateReview = (
  id: string,
  decision: "KEEP" | "REMOVE" | "REQUEST_CHANGES",
  note?: string,
) => api(`/admin/reviews/${id}/moderate`, { method: "POST", body: { decision, note } });
