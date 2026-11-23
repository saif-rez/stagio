// Business rules shared by the modules (mirror of front/src/lib/rules.ts).

export const MIN_REVIEWS_FOR_RATING = 3;
export const AUTO_HIDE_REPORTS = 3;
export const CONTACT_MESSAGE_MAX = 300;
export const MAX_CONTACTS_PER_DAY = 5;
export const CONTACT_EXPIRY_DAYS = 7;
export const ANONYMOUS_LABEL = "Étudiant(e) vérifié(e) – ISGB";
export const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Input filter: insults, phone numbers, named people. Returns a French message or null. */
export function moderateText(text: string): string | null {
  const words = text.toLowerCase().split(/[^\p{L}]+/u);
  if (words.some((w) => insults.includes(w))) return "Votre texte contient des propos insultants.";
  if (phonePattern.test(text)) return "Les numéros de téléphone ne sont pas autorisés.";
  if (personNamePattern.test(text))
    return "Ne citez pas de nom : on note une expérience de stage, jamais une personne.";
  return null;
}

type Rated = { ratingSupervision: number; ratingAtmosphere: number; ratingMissions: number };

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/** Company rating: null average below 3 visible reviews ("Pas encore assez d'avis"). */
export function ratingSummary(reviews: Rated[]) {
  if (reviews.length < MIN_REVIEWS_FOR_RATING) {
    return { count: reviews.length, average: null, criteria: null };
  }
  const supervision = avg(reviews.map((r) => r.ratingSupervision));
  const atmosphere = avg(reviews.map((r) => r.ratingAtmosphere));
  const missions = avg(reviews.map((r) => r.ratingMissions));
  return {
    count: reviews.length,
    average: round1((supervision + atmosphere + missions) / 3),
    criteria: {
      supervision: round1(supervision),
      atmosphere: round1(atmosphere),
      missions: round1(missions),
    },
  };
}

export function emailDomain(email: string) {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
