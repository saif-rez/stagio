import { describe, expect, it } from "vitest";
import {
  internshipTypeLabel,
  isStudentEmail,
  reportReasonLabel,
  reviewAverage,
  validContact,
  validPassword,
} from "@/lib/rules";

describe("Stagio rules", () => {
  it("allows only ISGB university email addresses", () => {
    expect(isStudentEmail("saif@isgb.ucar.tn")).toBe(true);
    expect(isStudentEmail("saif@gmail.com")).toBe(false);
    expect(isStudentEmail("saif@isgb.ucar.tn.evil.com")).toBe(false);
  });
  it("accepts contact messages only up to 300 characters", () => {
    expect(validContact("a".repeat(300))).toBe(true);
    expect(validContact("a".repeat(301))).toBe(false);
    expect(validContact("   ")).toBe(false);
  });
  it("requires 8+ characters with a letter and a digit", () => {
    expect(validPassword("motdepasse1")).toBe(true);
    expect(validPassword("motdepasse")).toBe(false);
    expect(validPassword("a1")).toBe(false);
  });
  it("labels API codes in French", () => {
    expect(internshipTypeLabel.SUMMER).toBe("Stage d’été");
    expect(reportReasonLabel.PERSONAL_DATA).toBe("Données personnelles");
  });
  it("averages the three criteria", () => {
    expect(reviewAverage({ supervision: 5, atmosphere: 4, missions: 3 })).toBe(4);
  });
});
