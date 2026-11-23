import cron from "node-cron";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { DAY_MS } from "../lib/rules.js";
import { notify } from "../services/notifications.js";

/** Pending contact requests expire after 7 days without an answer. */
export async function expireContactRequests(now = new Date()) {
  const { count } = await prisma.contactRequest.updateMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });
  return count;
}

/** Sponsored offers go back to their normal position when the 7/30-day period ends. */
export async function endExpiredSponsoring(now = new Date()) {
  const { count } = await prisma.offer.updateMany({
    where: { sponsored: true, sponsoredUntil: { lt: now } },
    data: { sponsored: false, sponsoredUntil: null },
  });
  return count;
}

/** Daily digest: new offers in followed domains, at most once a day, can be disabled. */
export async function sendNewOffersDigest(now = new Date()) {
  const since = new Date(now.getTime() - DAY_MS);
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      emailVerifiedAt: { not: null },
      digestEnabled: true,
      followedDomains: { isEmpty: false },
      OR: [{ lastDigestAt: null }, { lastDigestAt: { lt: new Date(now.getTime() - DAY_MS + 60_000) } }],
    },
    select: { id: true, followedDomains: true, lastDigestAt: true },
  });
  let sent = 0;
  for (const s of students) {
    const offers = await prisma.offer.findMany({
      where: {
        active: true,
        company: { status: "ACTIVE" },
        domain: { in: s.followedDomains },
        createdAt: { gt: s.lastDigestAt && s.lastDigestAt > since ? s.lastDigestAt : since },
      },
      select: { title: true, company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    if (offers.length === 0) continue;
    await notify({
      userId: s.id,
      type: "NEW_OFFERS_DIGEST",
      title: `${offers.length} nouvelle${offers.length > 1 ? "s" : ""} offre${offers.length > 1 ? "s" : ""} dans vos domaines`,
      body: offers.map((o) => `• ${o.title} — ${o.company.name}`).join("\n"),
      link: "/offres",
    });
    await prisma.user.update({ where: { id: s.id }, data: { lastDigestAt: now } });
    sent++;
  }
  return sent;
}

function safe(name: string, job: () => Promise<number>) {
  return async () => {
    try {
      const n = await job();
      if (n) console.info(`[cron] ${name}: ${n}`);
    } catch (err) {
      console.error(`[cron] ${name} failed`, err);
    }
  };
}

export function startJobs() {
  if (!env.CRON_ENABLED) return [];
  const options = { timezone: "Africa/Tunis" };
  return [
    cron.schedule("0 * * * *", safe("expired contact requests", expireContactRequests), options),
    cron.schedule("5 * * * *", safe("ended sponsoring", endExpiredSponsoring), options),
    cron.schedule(env.DIGEST_CRON, safe("new offers digest", sendNewOffersDigest), options),
  ];
}
