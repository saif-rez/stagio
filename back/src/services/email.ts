// Single email service (Nodemailer). Without SMTP_HOST, emails are printed to the console (dev).
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";

let transporter: Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

/** Checks the SMTP connection and credentials. Returns null when OK, or the error message. */
export async function verifyEmailTransport(): Promise<string | null> {
  if (!env.SMTP_HOST) return "SMTP_HOST non configuré : les emails sont affichés dans la console.";
  try {
    await getTransporter().verify();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, link?: string) {
  const button = link
    ? `<p style="margin-top:24px"><a href="${escapeHtml(link)}" style="background:#1F4E79;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Ouvrir Stagio</a></p>`
    : "";
  return `<div style="font-family:Inter,Arial,sans-serif;background:#F7FAFC;padding:24px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:28px;color:#1a2b3c">
    <h2 style="color:#1F4E79;margin-top:0">${escapeHtml(title)}</h2>
    <p style="line-height:1.6">${escapeHtml(body).replace(/\n/g, "<br>")}</p>${button}
    <p style="color:#8a99a8;font-size:12px;margin-top:28px">Stagio · La communauté des stagiaires ISGB</p>
  </div></div>`;
}

export async function sendEmail(to: string, subject: string, text: string, link?: string) {
  const info = await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    text: link ? `${text}\n\n${link}` : text,
    html: layout(subject, text, link),
  });
  if (!env.SMTP_HOST && env.NODE_ENV !== "test") {
    console.info(`[email] to=${to} subject="${subject}"\n${text}${link ? `\n${link}` : ""}`);
  }
  return info;
}

export function sendOtpEmail(to: string, code: string, purpose: "verify" | "reset") {
  return purpose === "verify"
    ? sendEmail(
        to,
        "Votre code de vérification Stagio",
        `Votre code de vérification est : ${code}\nIl expire dans 10 minutes.`,
      )
    : sendEmail(
        to,
        "Réinitialisation de votre mot de passe",
        `Votre code de réinitialisation est : ${code}\nIl expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
      );
}
