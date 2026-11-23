// Notifications are stored in-app and sent by email (spec §5).
import type { NotificationType } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { sendEmail } from "./email.js";

type Notify = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Frontend path, e.g. "/profil". */
  link?: string;
  email?: boolean;
};

export async function notify({ userId, type, title, body, link, email = true }: Notify) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, link: link ?? null },
  });
  if (email) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user) {
      const url = link ? new URL(link, env.FRONTEND_URL).toString() : undefined;
      // Email failures must never break the user action that triggered them.
      sendEmail(user.email, title, body, url).catch((err) =>
        console.error("[email] failed to send notification", err),
      );
    }
  }
  return notification;
}

/** Notifies the owner account of a company, if the page has been claimed. */
export async function notifyCompanyOwner(companyId: string, data: Omit<Notify, "userId">) {
  const owner = await prisma.user.findUnique({ where: { companyId }, select: { id: true } });
  if (owner) await notify({ ...data, userId: owner.id });
}
