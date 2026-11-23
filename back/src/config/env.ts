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
  // "lax" when the frontend proxies /api (same site). "none" only if the browser calls the API cross-site.
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  // Number of reverse proxies in front of Express (Vercel proxy + Render load balancer = 2).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Private file storage: local disk (dev) or S3-compatible bucket (Supabase Storage, R2, AWS).
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_DIR: z.string().default("./storage"),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  // Secret for externally triggered jobs (POST /api/internal/cron/:job). Empty = endpoint disabled.
  CRON_SECRET: z.string().min(32).optional().or(z.literal("").transform(() => undefined)),
  FILE_URL_SECRET: z.string().min(32),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(4),
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
if (
  env.STORAGE_DRIVER === "s3" &&
  !(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)
) {
  console.error("STORAGE_DRIVER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
  process.exit(1);
}
