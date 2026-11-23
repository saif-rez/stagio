import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, otpMatches } from "../src/lib/otp.js";
import { emailDomain, moderateText, ratingSummary } from "../src/lib/rules.js";
import { detectFileType, signedCertificateUrl, verifySignature } from "../src/lib/storage.js";
import { serializeReview, type ReviewWithRelations } from "../src/modules/reviews/serialize.js";
import { hashPassword, verifyPassword } from "../src/lib/password.js";

describe("business rules", () => {
  it("filters insults, phone numbers and named people", () => {
    expect(moderateText("Super ambiance, missions en Business Intelligence.")).toBeNull();
    expect(moderateText("Une équipe de connard")).not.toBeNull();
    expect(moderateText("Appelez-moi au 22 123 456")).not.toBeNull();
    expect(moderateText("Mon encadrant Ahmed était absent")).not.toBeNull();
  });

  it("hides the average below 3 reviews", () => {
    const r = { ratingSupervision: 5, ratingAtmosphere: 4, ratingMissions: 3 };
    expect(ratingSummary([r, r]).average).toBeNull();
    expect(ratingSummary([r, r, r])).toEqual({
      count: 3,
      average: 4,
      criteria: { supervision: 5, atmosphere: 4, missions: 3 },
    });
  });

  it("extracts the email domain", () => {
    expect(emailDomain(" Saif.Rezgui@ISGB.ucar.tn ")).toBe("isgb.ucar.tn");
  });
});

describe("security helpers", () => {
  it("generates 6-digit OTPs and stores only a hash", () => {
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
    const hash = hashOtp(code);
    expect(hash).not.toContain(code);
    expect(otpMatches(code, hash)).toBe(true);
    expect(otpMatches(code === "000000" ? "111111" : "000000", hash)).toBe(false);
  });

  it("hashes passwords with argon2id", async () => {
    const hash = await hashPassword("motdepasse1");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "motdepasse1")).toBe(true);
    expect(await verifyPassword(hash, "autre")).toBe(false);
  });

  it("signs certificate links that expire", () => {
    const key = `${"a".repeat(32)}.pdf`;
    const now = Date.now();
    const url = new URL(signedCertificateUrl(key, now).url);
    const expires = url.searchParams.get("expires")!;
    const sig = url.searchParams.get("sig")!;
    expect(verifySignature(key, expires, sig, now)).toBe(true);
    expect(verifySignature(`${"b".repeat(32)}.pdf`, expires, sig, now)).toBe(false);
    expect(verifySignature(key, expires, sig, now + 3600 * 1000)).toBe(false);
  });

  it("detects file types from content, not from the name", () => {
    expect(detectFileType(Buffer.from("%PDF-1.7"))?.ext).toBe("pdf");
    expect(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]))?.ext).toBe("png");
    expect(detectFileType(Buffer.from("<script>"))).toBeNull();
  });
});

describe("review privacy", () => {
  const review = {
    id: "r1",
    internshipId: "i1",
    authorId: "u1",
    companyId: "c1",
    ratingSupervision: 5,
    ratingAtmosphere: 4,
    ratingMissions: 5,
    comment: "Très bonne expérience",
    anonymous: true,
    contactOptIn: true,
    status: "PUBLISHED",
    reportCount: 0,
    createdAt: new Date("2026-03-14"),
    updatedAt: new Date("2026-03-14"),
    internship: { year: 2026, type: "PFE", domain: "Informatique", status: "VERIFIED" },
    author: { id: "u1", name: "Yasmine Ben Ali", email: "yasmine@isgb.ucar.tn" },
    reply: null,
    company: { id: "c1", name: "Vermeg", city: "Tunis", sector: "Fintech" },
  } as ReviewWithRelations;
  const student = { id: "u2", role: "STUDENT" } as never;
  const admin = { id: "a1", role: "ADMIN" } as never;

  it("never exposes the author of an anonymous review, nor exact dates", () => {
    const json = JSON.stringify(serializeReview(review, student));
    expect(json).not.toContain("Yasmine");
    expect(json).not.toContain("yasmine@");
    expect(json).not.toContain("2026-03-14");
    expect(serializeReview(review, student).authorName).toBe("Étudiant(e) vérifié(e) – ISGB");
    expect(serializeReview(review).year).toBe(2026);
  });

  it("shows the author to the admin only", () => {
    expect(JSON.stringify(serializeReview(review, admin))).toContain("Yasmine");
  });

  it("sets the Stage vérifié badge from the certificate check", () => {
    expect(serializeReview(review).badges).toEqual({ verifiedReview: true, verifiedInternship: true });
  });
});
