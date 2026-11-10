import { describe, it, expect } from "vitest";
import { personalInfoSchema, changePasswordSchema } from "./schemas";

type Issue = { message: string; path: PropertyKey[] };
const issues = (r: { success: boolean; error?: { issues: Issue[] } }): Issue[] =>
  r.success ? [] : (r.error?.issues ?? []);
const messages = (r: Parameters<typeof issues>[0]) => issues(r).map((i) => i.message);

describe("personalInfoSchema", () => {
  const base = { firstName: "Jean", lastName: "Rakoto", email: "jean@example.com", phone: "" };

  it("accepte e-mail seul", () => {
    expect(personalInfoSchema.safeParse(base).success).toBe(true);
  });
  it("accepte téléphone seul", () => {
    expect(personalInfoSchema.safeParse({ ...base, email: "", phone: "0341234567" }).success).toBe(true);
  });
  it("exige e-mail ou téléphone", () => {
    const r = personalInfoSchema.safeParse({ ...base, email: "", phone: "" });
    const found = issues(r).find((i) => i.message === "Renseignez un e-mail ou un téléphone.");
    expect(found?.path).toEqual(["email"]);
  });
  it("refuse un téléphone invalide", () => {
    expect(messages(personalInfoSchema.safeParse({ ...base, phone: "123" }))).toContain("Numéro invalide.");
  });
  it("refuse un e-mail invalide", () => {
    expect(messages(personalInfoSchema.safeParse({ ...base, email: "x" }))).toContain("Format invalide.");
  });
});

describe("changePasswordSchema", () => {
  const base = { currentPassword: "Ancien123", newPassword: "Nouveau123", confirmPassword: "Nouveau123" };

  it("accepte un changement valide", () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });
  it("exige l'ancien mot de passe", () => {
    expect(messages(changePasswordSchema.safeParse({ ...base, currentPassword: "" }))).toContain("Requis.");
  });
  it("refuse un nouveau mot de passe trop court", () => {
    const r = changePasswordSchema.safeParse({ ...base, newPassword: "Ab1", confirmPassword: "Ab1" });
    expect(messages(r)).toContain("8 caractères minimum.");
  });
  it("refuse un nouveau mot de passe trop simple", () => {
    const r = changePasswordSchema.safeParse({ ...base, newPassword: "abcdefgh", confirmPassword: "abcdefgh" });
    expect(messages(r)).toContain("Majuscule, minuscule, chiffre requis.");
  });
  it("refuse une confirmation différente", () => {
    const r = changePasswordSchema.safeParse({ ...base, confirmPassword: "Autre1234" });
    const found = issues(r).find((i) => i.message === "Les mots de passe ne correspondent pas.");
    expect(found?.path).toEqual(["confirmPassword"]);
  });
});
