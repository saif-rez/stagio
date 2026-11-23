// Business rules and French UI labels. The backend enforces the same rules;
// these copies give instant feedback in forms.
import type {
  ContactChannel,
  ContactStatus,
  InternshipStatus,
  InternshipType,
  ReportReason,
  ReviewStatus,
} from "@/types";

export const STUDENT_EMAIL_DOMAIN = "isgb.ucar.tn";
export const ANONYMOUS_LABEL = "Étudiant(e) vérifié(e) – ISGB";
export const CONTACT_MESSAGE_MAX = 300;
export const MAX_CONTACTS_PER_DAY = 5;
export const CONTACT_EXPIRY_DAYS = 7;
export const MIN_REVIEW_LENGTH = 20;

export const DOMAINS = ["Informatique", "Data & IA", "Finance", "Marketing", "Gestion"] as const;
export const CITIES = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Bizerte",
  "Sousse",
  "Sfax",
  "Nabeul",
] as const;

/** Rating criteria, keyed like the API `ratings` object. */
export const criteria = [
  { key: "supervision", label: "Qualité de l’encadrement" },
  { key: "atmosphere", label: "Ambiance" },
  { key: "missions", label: "Intérêt des missions" },
] as const;

export const internshipTypeLabel: Record<InternshipType, string> = {
  PFE: "PFE",
  SUMMER: "Stage d’été",
};

export const reportReasonLabel: Record<ReportReason, string> = {
  FAKE_REVIEW: "Faux avis",
  INSULTS: "Insultes",
  PERSONAL_DATA: "Données personnelles",
  OFF_TOPIC: "Hors sujet",
};

export const internshipStatusLabel: Record<InternshipStatus, string> = {
  DECLARED: "Attestation non fournie",
  PENDING_VERIFICATION: "En attente de vérification",
  VERIFIED: "Stage vérifié",
  REJECTED: "Attestation refusée",
};

export const reviewStatusLabel: Record<ReviewStatus, string> = {
  PUBLISHED: "Publié",
  HIDDEN: "Masqué (signalements)",
  CHANGES_REQUESTED: "Modification demandée",
  REMOVED: "Supprimé par la modération",
};

export const contactStatusLabel: Record<ContactStatus, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REFUSED: "Refusée",
  EXPIRED: "Expirée",
};

export const contactChannelLabel: Record<ContactChannel, string> = {
  EMAIL: "Email",
  LINKEDIN: "LinkedIn",
  WHATSAPP: "WhatsApp",
};

export function isStudentEmail(email: string) {
  return /^[^\s@]+@isgb\.ucar\.tn$/i.test(email.trim());
}

export function validContact(message: string) {
  return message.trim().length > 0 && message.length <= CONTACT_MESSAGE_MAX;
}

export function validPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

const insults = [
  "con",
  "connard",
  "conne",
  "idiot",
  "idiote",
  "merde",
  "salaud",
  "abruti",
  "débile",
  "imbécile",
  "putain",
];
// Tunisian phone number: 8 digits, optionally grouped and prefixed with +216.
const phonePattern = /(?:\+216[\s.-]?)?\b[2-9]\d(?:[\s.-]?\d{3}){2}\b/;
// Proper name introduced by a title or a role ("M. Trabelsi", "mon encadrant Ahmed").
const personNamePattern =
  /(?:\b(?:M\.|Mme|Mr|Monsieur|Madame)|\b(?:encadrante?|manager|chef|responsable|tuteur|tutrice))\s+\p{Lu}\p{Ll}+/u;

/**
 * Input filter (§4.2): blocks insults, phone numbers and named people.
 * Returns a French error message for the UI, or null when the text is accepted.
 */
export function moderateText(text: string): string | null {
  const words = text.toLowerCase().split(/[^\p{L}]+/u);
  if (words.some((w) => insults.includes(w))) return "Votre texte contient des propos insultants.";
  if (phonePattern.test(text)) return "Les numéros de téléphone ne sont pas autorisés.";
  if (personNamePattern.test(text))
    return "Ne citez pas de nom : on note une expérience de stage, jamais une personne.";
  return null;
}

/** Mean of the three criteria of one review. */
export function reviewAverage(r: { supervision: number; atmosphere: number; missions: number }) {
  return (r.supervision + r.atmosphere + r.missions) / 3;
}
