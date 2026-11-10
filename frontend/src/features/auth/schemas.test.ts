import { describe, it, expect } from "vitest";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "./schemas";

type Issue = { message: string; path: PropertyKey[] };
const issues = (r: { success: boolean; error?: { issues: Issue[] } }): Issue[] =>
  r.success ? [] : (r.error?.issues ?? []);
const messages = (r: Parameters<typeof issues>[0]) => issues(r).map((i) => i.message);

describe("loginSchema", () => {
  it("accepte identifiant + mot de passe", () => {
    expect(loginSchema.safeParse({ identifier: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("refuse un identifiant vide", () => {
    const r = loginSchema.safeParse({ identifier: "", password: "x" });
    expect(messages(r)).toContain("Email ou téléphone requis.");
  });
  it("refuse un mot de passe vide", () => {
    const r = loginSchema.safeParse({ identifier: "a@b.com", password: "" });
    expect(messages(r)).toContain("Mot de passe requis.");
  });
});

describe("registerSchema", () => {
  const base = {
    firstName: "Jean",
    lastName: "Rakoto",
    email: "jean@example.com",
    phone: "0341234567",
    password: "Test1234!",
    confirmPassword: "Test1234!",
    terms: true,
  };

  it("accepte une inscription complète (e-mail + téléphone)", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("accepte un numéro écrit avec des espaces ou en +261", () => {
    expect(registerSchema.safeParse({ ...base, phone: "034 12 345 67" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, phone: "+261341234567" }).success).toBe(true);
  });

  it("exige l'e-mail", () => {
    const found = issues(registerSchema.safeParse({ ...base, email: "" })).find((i) => i.message === "E-mail requis.");
    expect(found?.path).toEqual(["email"]);
  });

  it("exige le téléphone", () => {
    const found = issues(registerSchema.safeParse({ ...base, phone: "" })).find(
      (i) => i.message === "Numéro de téléphone requis.",
    );
    expect(found?.path).toEqual(["phone"]);
  });

  it("refuse un e-mail invalide", () => {
    expect(messages(registerSchema.safeParse({ ...base, email: "pas-un-mail" }))).toContain(
      "Format d'e-mail invalide.",
    );
  });

  it("refuse un téléphone invalide", () => {
    expect(messages(registerSchema.safeParse({ ...base, phone: "0351234567" }))).toContain(
      "Numéro invalide (ex: 034XXXXXXX).",
    );
  });

  it("refuse un prénom ou un nom trop court", () => {
    const r = registerSchema.safeParse({ ...base, firstName: "J", lastName: "R" });
    expect(messages(r)).toEqual(expect.arrayContaining(["Prénom trop court.", "Nom trop court."]));
  });

  it("refuse un mot de passe trop court", () => {
    const r = registerSchema.safeParse({ ...base, password: "Ab1", confirmPassword: "Ab1" });
    expect(messages(r)).toContain("8 caractères minimum.");
  });

  it("refuse un mot de passe sans majuscule/minuscule/chiffre", () => {
    const r = registerSchema.safeParse({ ...base, password: "abcdefgh", confirmPassword: "abcdefgh" });
    expect(messages(r)).toContain("Majuscule, minuscule et chiffre requis.");
  });

  it("refuse une confirmation différente", () => {
    const r = registerSchema.safeParse({ ...base, confirmPassword: "Autre1234!" });
    const found = issues(r).find((i) => i.message === "Les mots de passe ne correspondent pas.");
    expect(found?.path).toEqual(["confirmPassword"]);
  });

  it("exige l'acceptation des conditions", () => {
    const r = registerSchema.safeParse({ ...base, terms: false });
    expect(messages(r)).toContain("Vous devez accepter les conditions.");
  });
});

describe("forgotPasswordSchema", () => {
  it("accepte un e-mail valide", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
  it("refuse un e-mail vide ou invalide", () => {
    expect(messages(forgotPasswordSchema.safeParse({ email: "" }))).toContain("E-mail requis.");
    expect(messages(forgotPasswordSchema.safeParse({ email: "xx" }))).toContain("Format d'e-mail invalide.");
  });
});

describe("resetPasswordSchema", () => {
  it("accepte un mot de passe conforme et confirmé", () => {
    expect(resetPasswordSchema.safeParse({ newPassword: "Nouveau1234", confirmPassword: "Nouveau1234" }).success).toBe(true);
  });
  it("refuse un mot de passe faible", () => {
    expect(messages(resetPasswordSchema.safeParse({ newPassword: "faible", confirmPassword: "faible" }))).toContain(
      "8 caractères minimum.",
    );
  });
  it("refuse une confirmation différente", () => {
    const found = issues(resetPasswordSchema.safeParse({ newPassword: "Nouveau1234", confirmPassword: "Autre1234" })).find(
      (i) => i.message === "Les mots de passe ne correspondent pas.",
    );
    expect(found?.path).toEqual(["confirmPassword"]);
  });
});
