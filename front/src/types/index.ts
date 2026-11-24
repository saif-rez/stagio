// Shared types, mirroring the JSON returned by the backend (/back, Prisma schema).

export type Role = "STUDENT" | "COMPANY" | "ADMIN";
export type InternshipType = "PFE" | "SUMMER";
export type InternshipStatus = "DECLARED" | "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
export type ReviewStatus = "PUBLISHED" | "HIDDEN" | "CHANGES_REQUESTED" | "REMOVED";
export type ReportReason = "FAKE_REVIEW" | "INSULTS" | "PERSONAL_DATA" | "OFF_TOPIC";
export type ContactStatus = "PENDING" | "ACCEPTED" | "REFUSED" | "EXPIRED";
export type ContactChannel = "EMAIL" | "LINKEDIN" | "WHATSAPP";
export type ClaimStatus = "PENDING" | "ACCEPTED" | "REFUSED";
export type CompanyStatus = "ACTIVE" | "PENDING" | "REFUSED";
export type ApplicationMode = "LINK" | "EMAIL";

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  companyId: string | null;
};

export type Session = {
  user: User & {
    followedDomains: string[];
    digestEnabled: boolean;
    establishment: { id: string; name: string } | null;
  };
  companyAccount?: { status: ClaimStatus; company: { id: string; name: string } };
  unreadNotifications: number;
};

export type RatingSummary = {
  count: number;
  /** null below 3 reviews ("Pas encore assez d'avis"). */
  average: number | null;
  criteria: { supervision: number; atmosphere: number; missions: number } | null;
  /** Demonstration reviews included in this rating. */
  demoCount: number;
};

export type CompanyRef = { id: string; name: string; city: string; sector: string };

export type Company = CompanyRef & {
  description: string;
  claimed: boolean;
  rating: RatingSummary;
};

export type Offer = {
  id: string;
  title: string;
  description: string;
  company: CompanyRef;
  city: string;
  type: InternshipType;
  domain: string;
  sponsored: boolean;
  /** Demonstration offer (labelled, cannot be applied to). */
  demo: boolean;
  source: { name: string | null; url: string | null } | null;
  apply: { mode: ApplicationMode; url: string | null };
  companyRating: RatingSummary | null;
  publishedAt: string;
  // Company / admin views only
  active?: boolean;
  views?: number;
  sponsorRequested?: boolean;
  sponsoredUntil?: string | null;
};

export type Ratings = { supervision: number; atmosphere: number; missions: number };

export type Review = {
  id: string;
  company: CompanyRef;
  /** Display name, or "Étudiant(e) vérifié(e) – ISGB" for anonymous reviews. */
  authorName: string;
  anonymous: boolean;
  /** Only the year is ever exposed. */
  year: number;
  type: InternshipType;
  domain: string;
  ratings: Ratings;
  comment: string;
  contactOptIn: boolean;
  /** Demonstration review (labelled "Avis de démonstration"). */
  demo: boolean;
  badges: { verifiedReview: boolean; verifiedInternship: boolean };
  reply: { body: string } | null;
  isMine: boolean;
  status?: ReviewStatus;
  admin?: {
    author: { id: string; name: string; email: string } | null;
    reportCount: number;
    createdAt: string;
  };
  reports?: { reason: ReportReason; createdAt: string }[];
};

export type Internship = {
  id: string;
  companyId: string;
  year: number;
  type: InternshipType;
  domain: string;
  status: InternshipStatus;
  createdAt: string;
  company: CompanyRef & { status: CompanyStatus };
  hasCertificate: boolean;
  review: Review | null;
};

export type ContactRequest = {
  id: string;
  box: "received" | "sent";
  otherParty: string;
  review: { id: string; company: { id: string; name: string }; year: number; type: InternshipType };
  message: string;
  status: ContactStatus;
  expiresAt: string;
  createdAt: string;
  contact: { channel: ContactChannel; value: string } | null;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type CompanyDashboard = {
  company: CompanyRef & { description: string; status: CompanyStatus };
  stats: {
    activeOffers: number;
    offerViews: number;
    reviews: number;
    replies: number;
    rating: RatingSummary;
  };
};

export type OfferInput = {
  title: string;
  description: string;
  city: string;
  type: InternshipType;
  domain: string;
  applicationMode: ApplicationMode;
  applicationUrl?: string;
  applicationEmail?: string;
};

export type AdminClaim = {
  id: string;
  taxId: string;
  rne: string | null;
  status: ClaimStatus;
  createdAt: string;
  user: { id: string; name: string; email: string; emailVerifiedAt: string | null };
  company: CompanyRef & { status: CompanyStatus };
};

export type AdminCompany = CompanyRef & {
  description: string;
  status: CompanyStatus;
  createdAt: string;
  proposedBy: { id: string; name: string; email: string } | null;
  owner: { id: string; name: string; email: string } | null;
  _count: { internships: number; reviews: number; offers: number };
};

export type AdminInternship = {
  id: string;
  year: number;
  type: InternshipType;
  domain: string;
  status: InternshipStatus;
  hasCertificate: boolean;
  student: { id: string; name: string; email: string } | null;
  company: { id: string; name: string };
};

export type AdminStats = {
  beta: {
    students: number;
    verifiedStudents: number;
    reviews: number;
    ratedCompanies: number;
    claimedCompanies: number;
  };
  queues: {
    pendingClaims: number;
    pendingCompanies: number;
    pendingCertificates: number;
    hiddenReviews: number;
  };
};

export type PublicStats = { companies: number; offers: number; reviews: number };
