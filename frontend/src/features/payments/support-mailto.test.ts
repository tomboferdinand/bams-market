import { describe, it, expect } from "vitest";
import { refundMailto, supportMailto } from "./support-mailto";

describe("supportMailto", () => {
  it("met le numéro de commande dans l'objet", () => {
    const href = supportMailto("support@exemple.mg", 42);
    expect(href.startsWith("mailto:support@exemple.mg?subject=")).toBe(true);
    expect(decodeURIComponent(href.split("subject=")[1])).toBe("Problème de paiement - commande #42");
  });
  it("sans commande connue : objet générique", () => {
    expect(decodeURIComponent(supportMailto("support@exemple.mg").split("subject=")[1])).toBe("Problème de paiement");
  });
});

describe("refundMailto", () => {
  it("objet : remboursement de la commande", () => {
    const href = refundMailto("support@exemple.mg", 7);
    expect(href.startsWith("mailto:support@exemple.mg?subject=")).toBe(true);
    expect(decodeURIComponent(href.split("subject=")[1])).toBe("Remboursement commande #7");
  });
});
