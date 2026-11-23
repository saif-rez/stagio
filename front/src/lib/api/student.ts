// Student space: declared internships, reviews, reports, contact requests.
import type {
  ContactChannel,
  ContactRequest,
  Internship,
  InternshipType,
  Paginated,
  Ratings,
  ReportReason,
  Review,
} from "@/types";
import { api } from "./client";

export const listMyInternships = () => api<{ items: Internship[] }>("/internships/me");

export type DeclareInternship = {
  companyId?: string;
  proposedCompany?: { name: string; city: string; sector: string };
  year: number;
  type: InternshipType;
  domain: string;
};

export const declareInternship = (body: DeclareInternship) =>
  api<{ internship: Internship }>("/internships", { method: "POST", body });

export function uploadCertificate(internshipId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return api<{ status: string }>(`/internships/${internshipId}/certificate`, {
    method: "POST",
    body: form,
  });
}

export type ReviewInput = {
  ratings: Ratings;
  comment: string;
  anonymous: boolean;
  contactOptIn: boolean;
};

export const publishReview = (internshipId: string, body: ReviewInput) =>
  api<{ review: Review }>(`/internships/${internshipId}/review`, { method: "POST", body });

export const listMyReviews = () => api<{ items: Review[] }>("/reviews/me");

export const updateReview = (id: string, body: Partial<ReviewInput>) =>
  api<{ review: Review }>(`/reviews/${id}`, { method: "PATCH", body });

/** Students and companies can report a review. */
export const reportReview = (id: string, reason: ReportReason) =>
  api<{ ok: true }>(`/reviews/${id}/reports`, { method: "POST", body: { reason } });

export const sendContactRequest = (reviewId: string, message: string) =>
  api<{ request: ContactRequest }>("/contact-requests", {
    method: "POST",
    body: { reviewId, message },
  });

export const listContactRequests = (box: "received" | "sent") =>
  api<Paginated<ContactRequest>>("/contact-requests", { query: { box, limit: 50 } });

export const acceptContactRequest = (id: string, channel: ContactChannel, value: string) =>
  api<{ request: ContactRequest }>(`/contact-requests/${id}/accept`, {
    method: "POST",
    body: { channel, value },
  });

export const refuseContactRequest = (id: string) =>
  api<{ request: ContactRequest }>(`/contact-requests/${id}/refuse`, { method: "POST" });
