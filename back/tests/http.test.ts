// HTTP checks that never reach the database (no session cookie, or invalid input).
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("HTTP layer", () => {
  it("answers the health check with security headers", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("uses the single error format for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Route introuvable." } });
  });

  it("rejects invalid JSON with the error format", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("validates input with zod", async () => {
    const res = await request(app).post("/api/auth/register/student").send({ email: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it.each([
    ["get", "/api/auth/me"],
    ["get", "/api/internships/me"],
    ["post", "/api/contact-requests"],
    ["get", "/api/notifications"],
    ["get", "/api/company/dashboard"],
    ["get", "/api/admin/stats"],
    ["get", "/api/files/certificates/abc.pdf"],
  ] as const)("requires a session on %s %s", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("ignores forged session cookies", async () => {
    const res = await request(app).get("/api/admin/stats").set("Cookie", "stagio_session=forged.jwt.token");
    expect(res.status).toBe(401);
  });

  it("allows CORS only for the frontend origin", async () => {
    const ok = await request(app).get("/api/health").set("Origin", "http://localhost:8080");
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:8080");
    expect(ok.headers["access-control-allow-credentials"]).toBe("true");
    const bad = await request(app).get("/api/health").set("Origin", "https://evil.example");
    expect(bad.headers["access-control-allow-origin"]).not.toBe("https://evil.example");
  });
});
