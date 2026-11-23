import { env } from "./config/env.js";
import { startJobs } from "./jobs/cron.js";
import { prisma } from "./lib/prisma.js";
import { createApp } from "./app.js";
import { verifyEmailTransport } from "./services/email.js";

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.info(`Stagio API listening on http://localhost:${env.PORT}/api`);
});
const jobs = startJobs();

// Report SMTP problems at startup instead of at the first sign-up.
void verifyEmailTransport().then((problem) => {
  if (!env.SMTP_HOST) console.warn(`[email] ${problem}`);
  else if (problem) console.error(`[email] SMTP connection failed: ${problem}`);
  else console.info(`[email] SMTP ready (${env.SMTP_HOST}:${env.SMTP_PORT})`);
});

async function shutdown(signal: string) {
  console.info(`${signal} received, shutting down…`);
  jobs.forEach((j) => j.stop());
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
