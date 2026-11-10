import { describe, it, expect } from "vitest";
import { maskEmail } from "./mask-email";

describe("maskEmail", () => {
  it("garde deux caractères et le domaine", () => {
    expect(maskEmail("jean.dupont@gmail.com")).toBe("je••••••@gmail.com");
  });
  it("gère les parties locales très courtes", () => {
    expect(maskEmail("a@x.mg")).toBe("a•@x.mg");
    expect(maskEmail("ab@x.mg")).toBe("a•@x.mg");
  });
  it("limite le nombre de points affichés", () => {
    expect(maskEmail("abcdefghijklmnop@x.mg")).toBe("ab••••••@x.mg");
  });
  it("renvoie tel quel un texte sans @", () => {
    expect(maskEmail("pas-un-email")).toBe("pas-un-email");
  });
});
