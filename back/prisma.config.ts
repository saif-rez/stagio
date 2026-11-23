import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// With a config file, Prisma no longer loads .env by itself.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
