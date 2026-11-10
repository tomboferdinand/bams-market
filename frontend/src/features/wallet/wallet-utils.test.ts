import { describe, it, expect } from "vitest";
import { parseAmount, amountIssue, isFuture, withdrawBlocker } from "./wallet-utils";

describe("wallet-utils", () => {
  it("lit un montant entier positif", () => {
    expect(parseAmount("5 000")).toBe(5000);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("12,5")).toBeNull();
    expect(parseAmount("-3")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });

  it("contrôle le montant selon les limites, le plafond journalier et le disponible", () => {
    const s = { minAmount: 1000, maxAmount: 500000, dailyRemaining: 20000 };
    expect(amountIssue(null, s, 99999)).toMatch(/montant/i);
    expect(amountIssue(500, s, 99999)).toMatch(/minimum/);
    expect(amountIssue(600000, { ...s, dailyRemaining: 9999999 }, 9999999)).toMatch(/maximum/);
    expect(amountIssue(25000, s, 99999)).toMatch(/journalier/);
    expect(amountIssue(5000, s, 4000)).toMatch(/disponible/);
    expect(amountIssue(5000, s, 5000)).toBeNull();
  });

  it("détecte une date future", () => {
    const now = Date.parse("2026-10-29T12:00:00Z");
    expect(isFuture("2026-10-30T12:00:00Z", now)).toBe(true);
    expect(isFuture("2026-10-28T12:00:00Z", now)).toBe(false);
    expect(isFuture(null, now)).toBe(false);
  });

  describe("withdrawBlocker", () => {
    const now = Date.parse("2026-10-29T12:00:00Z");
    const ok = { payoutPhone: "0341234567", authLockedUntil: null, minAmount: 1000, dailyRemaining: 1000000, dailyRemainingCount: 5 };
    const fmt = (iso: string) => `<${iso}>`;

    it("ne bloque pas un compte prêt avec assez de solde", () => {
      expect(withdrawBlocker(ok, 5000, fmt, now)).toBeNull();
    });

    it("explique l'absence de numéro de retrait", () => {
      expect(withdrawBlocker({ ...ok, payoutPhone: null }, 5000, fmt, now)).toMatch(/administration/);
    });

    it("explique un blocage de confirmation en cours, mais pas un blocage expiré", () => {
      expect(withdrawBlocker({ ...ok, authLockedUntil: "2026-10-29T12:15:00Z" }, 5000, fmt, now)).toContain("<2026-10-29T12:15:00Z>");
      expect(withdrawBlocker({ ...ok, authLockedUntil: "2026-10-29T11:00:00Z" }, 5000, fmt, now)).toBeNull();
    });

    it("explique les plafonds journaliers atteints", () => {
      expect(withdrawBlocker({ ...ok, dailyRemainingCount: 0 }, 5000, fmt, now)).toMatch(/24 h/);
      expect(withdrawBlocker({ ...ok, dailyRemaining: 500 }, 5000, fmt, now)).toMatch(/Plafond journalier/);
    });

    it("explique un solde disponible trop faible", () => {
      expect(withdrawBlocker(ok, 400, fmt, now)).toMatch(/au moins 1000 Ar/);
    });
  });
});
