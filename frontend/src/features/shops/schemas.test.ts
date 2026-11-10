import { describe, it, expect } from "vitest";
import { shopSchema } from "./schemas";

const messages = (r: ReturnType<typeof shopSchema.safeParse>) =>
  r.success ? [] : r.error.issues.map((i) => i.message);

describe("shopSchema", () => {
  const base = {
    name: "Chez Bam",
    description: "Épicerie locale de Fianarantsoa",
    address: "Rue Rainandriamampandry",
    contactPhone: "0341234567",
  };

  it("accepte une boutique valide", () => {
    expect(shopSchema.safeParse(base).success).toBe(true);
  });
  it("refuse un nom trop court", () => {
    expect(messages(shopSchema.safeParse({ ...base, name: "B" }))).toContain("Nom trop court.");
  });
  it("exige une description d'au moins 10 caractères", () => {
    expect(messages(shopSchema.safeParse({ ...base, description: "court" }))).toContain(
      "Description trop courte (10 caractères min).",
    );
  });
  it("refuse une adresse trop courte", () => {
    expect(messages(shopSchema.safeParse({ ...base, address: "Rue" }))).toContain("Adresse trop courte.");
  });
  it("refuse un téléphone invalide", () => {
    expect(messages(shopSchema.safeParse({ ...base, contactPhone: "0351234567" }))).toContain(
      "Numéro invalide (ex: 034XXXXXXX).",
    );
  });
  it("exige un téléphone (non optionnel)", () => {
    expect(shopSchema.safeParse({ ...base, contactPhone: "" }).success).toBe(false);
  });
});
