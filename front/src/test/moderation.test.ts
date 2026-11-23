import { describe, expect, it } from "vitest";
import { moderateText, reportReasonLabel } from "@/lib/rules";

describe("Filtre automatique à la saisie (§4.2)", () => {
  it("accepte un avis normal", () => {
    expect(
      moderateText("Super ambiance, missions en Business Intelligence. Je recommande !"),
    ).toBeNull();
    expect(moderateText("Stage 2025 2026 chez Vermeg, nulle part ailleurs.")).toBeNull();
  });
  it("bloque les insultes", () => {
    expect(moderateText("Une équipe de connard")).not.toBeNull();
  });
  it("bloque les numéros de téléphone", () => {
    expect(moderateText("Appelez-moi au 22 123 456")).not.toBeNull();
    expect(moderateText("+216 98123456")).not.toBeNull();
  });
  it("bloque les noms de personnes", () => {
    expect(moderateText("Mon encadrant Ahmed était absent")).not.toBeNull();
    expect(moderateText("M. Trabelsi ne répondait jamais")).not.toBeNull();
  });
  it("propose les motifs de signalement du cahier des charges", () => {
    expect(Object.values(reportReasonLabel)).toEqual([
      "Faux avis",
      "Insultes",
      "Données personnelles",
      "Hors sujet",
    ]);
  });
});
