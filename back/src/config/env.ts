import { existsSync } from "node:fs";
import { z } from "zod";

// Load .env when present (Node >= 20.12). Tests inject their own variables.
if (process.env["NODE_ENV"] !== "test" && existsSync(".env")) process.loadEnvFile(".env");

// All configuration comes from the environment; never hard-code secrets.
const bool = (fallback: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(fallback)
    .transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_URL: z.url().default("http://localhost:4000"),
  FRONTEND_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_NAME: z.string().default("stagio_session"),
  STORAGE_DIR: z.string().default("./storage"),
  FILE_URL_SECRET: z.string().min(32),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: bool("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default("Stagio <no-reply@stagio.tn>"),
  CRON_ENABLED: bool("true"),
  DIGEST_CRON: z.string().default("0 8 * * *"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

// Without SMTP, OTP codes would only be printed to the server console: never acceptable in production.
if (isProd && !env.SMTP_HOST) {
  console.error("SMTP_HOST is required in production (verification codes must be emailed).");
  process.exit(1);
}
