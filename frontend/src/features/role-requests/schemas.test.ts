import { describe, it, expect } from "vitest";
import { roleRequestSchema } from "./schemas";

const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => i.message);

describe("roleRequestSchema", () => {
  const ok = { requestedRole: "COMMERCANT", payoutPhone: "034 12 345 67", message: "Boutique de fruits" };

  it("accepte une demande complète", () => {
    expect(roleRequestSchema.safeParse(ok).success).toBe(true);
    expect(roleRequestSchema.safeParse({ ...ok, requestedRole: "LIVREUR", message: undefined }).success).toBe(true);
  });
  it("refuse un rôle absent ou interdit", () => {
    expect(roleRequestSchema.safeParse({ ...ok, requestedRole: "ADMINISTRATEUR" }).success).toBe(false);
    expect(roleRequestSchema.safeParse({ payoutPhone: "0341234567" }).success).toBe(false);
  });
  it("exige un numéro Mobile Money valide", () => {
    expect(messages(roleRequestSchema.safeParse({ ...ok, payoutPhone: "" }))).toContain("Numéro Mobile Money requis.");
    expect(messages(roleRequestSchema.safeParse({ ...ok, payoutPhone: "0351234567" }))).toContain("Numéro invalide (ex: 034XXXXXXX).");
  });
  it("limite le message à 500 caractères", () => {
    expect(messages(roleRequestSchema.safeParse({ ...ok, message: "x".repeat(501) }))).toContain("500 caractères maximum.");
  });
});
