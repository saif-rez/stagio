import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/stagio_test",
      DIRECT_URL: "postgresql://test:test@localhost:5432/stagio_test",
      JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
      FILE_URL_SECRET: "test-file-secret-at-least-32-characters-long",
      FRONTEND_URL: "http://localhost:8080",
      CRON_ENABLED: "false",
    },
  },
});
