// Legal information shown in the CGU and privacy policy. Edit here, in one place.
// Bump TERMS_VERSION (and back/src/lib/rules.ts) whenever the CGU / policy change materially.

export const TERMS_VERSION = "2026-11-24";
export const TERMS_DATE_LABEL = "24 novembre 2026";

export const LEGAL = {
  serviceName: "Stagio",
  siteUrl: "https://stagio-nine.vercel.app",
  publisher: "Saif Eddine Rezgui, porteur du projet Stagio",
  pilotEstablishment: "ISGB (Université de Carthage)",
  contactEmail: "greenimpact.platform@gmail.com",
  /** Fill in once the declaration to the INPDP is filed (organic law no. 2004-63). */
  inpdpDeclaration: "en cours de déclaration auprès de l’INPDP",
  /** Service providers that process data on behalf of Stagio. */
  processors: [
    {
      name: "Vercel Inc.",
      role: "hébergement du site web",
      location: "États-Unis / réseau mondial",
    },
    {
      name: "Render Services Inc.",
      role: "hébergement du serveur applicatif",
      location: "Union européenne (Francfort)",
    },
    {
      name: "Neon Inc.",
      role: "base de données (comptes, avis, attestations)",
      location: "États-Unis (AWS, Ohio)",
    },
    {
      name: "Google (Gmail)",
      role: "envoi des emails (codes, notifications)",
      location: "États-Unis / Union européenne",
    },
  ],
} as const;
