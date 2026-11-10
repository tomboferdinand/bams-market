import { describe, it, expect } from "vitest";
import { formatPrice, formatDate, formatDateTime, initials, isToday } from "./format";

// Intl insère des espaces insécables : on les normalise pour comparer.
const norm = (s: string) => s.replace(/\s/g, " ");

describe("formatPrice", () => {
  it("sépare les milliers à la française", () => {
    expect(norm(formatPrice(1234567))).toBe("1 234 567");
  });
  it("laisse un petit nombre inchangé", () => {
    expect(formatPrice(500)).toBe("500");
  });
  it("gère zéro", () => {
    expect(formatPrice(0)).toBe("0");
  });
});

describe("formatDate / formatDateTime", () => {
  // Date locale sans « Z » : le résultat ne dépend pas du fuseau horaire.
  const iso = "2026-03-15T12:00:00";

  it("formatDate contient le jour et l'année", () => {
    const out = formatDate(iso);
    expect(out).toContain("15");
    expect(out).toContain("2026");
  });
  it("formatDateTime contient aussi l'heure", () => {
    const out = formatDateTime(iso);
    expect(out).toContain("15");
    expect(out).toContain("2026");
    expect(out).toContain("12:00");
  });
});

describe("initials", () => {
  it("met en majuscules les initiales", () => {
    expect(initials("jean", "dupont")).toBe("JD");
  });
  it("tolère des champs vides", () => {
    expect(initials("", "")).toBe("");
    expect(initials("Rino", "")).toBe("R");
  });
});

describe("isToday", () => {
  it("vrai pour maintenant", () => {
    expect(isToday(new Date().toISOString())).toBe(true);
  });
  it("faux pour il y a deux jours", () => {
    expect(isToday(new Date(Date.now() - 48 * 3600 * 1000).toISOString())).toBe(false);
  });
});
