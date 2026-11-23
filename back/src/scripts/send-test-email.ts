// Sends a test email with the SMTP settings from .env.
// Usage: npm run email:test -- someone@example.com
import { env } from "../config/env.js";
import { sendEmail, verifyEmailTransport } from "../services/email.js";

const to = process.argv[2];
if (!to || !to.includes("@")) {
  console.error("Usage: npm run email:test -- destinataire@exemple.com");
  process.exit(1);
}
if (!env.SMTP_HOST) {
  console.error("SMTP_HOST est vide dans .env : configurez d'abord votre fournisseur SMTP.");
  process.exit(1);
}

const problem = await verifyEmailTransport();
if (problem) {
  console.error(`Connexion SMTP impossible (${env.SMTP_HOST}:${env.SMTP_PORT}) : ${problem}`);
  process.exit(1);
}
console.info(`Connexion SMTP OK (${env.SMTP_HOST}:${env.SMTP_PORT}). Envoi à ${to}…`);
const info = await sendEmail(
  to,
  "Test d'envoi Stagio",
  "Si vous lisez ce message, l'envoi d'emails de Stagio fonctionne.\nLes codes de vérification et les notifications seront envoyés par ce même canal.",
  env.FRONTEND_URL,
);
console.info(`Email envoyé (id ${info.messageId}). Vérifiez aussi le dossier spam.`);
process.exit(0);
