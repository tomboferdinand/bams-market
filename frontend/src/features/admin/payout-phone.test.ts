import { describe, it, expect } from "vitest";
import { normalizeMobile, payoutPhoneIssue } from "./payout-phone";

describe("payout-phone", () => {
  it("normalise les numéros malgaches", () => {
    expect(normalizeMobile("0341234567")).toBe("0341234567");
    expect(normalizeMobile("+261 34 12 345 67")).toBe("0341234567");
    expect(normalizeMobile("261321234567")).toBe("0321234567");
    expect(normalizeMobile("0351234567")).toBeNull();
    expect(normalizeMobile("034123")).toBeNull();
  });

  it("refuse un numéro invalide, identique à l'actuel, ou sans motif suffisant", () => {
    expect(payoutPhoneIssue("12345", "Numéro perdu", null)).toMatch(/invalide/);
    expect(payoutPhoneIssue("034 12 345 67", "Numéro perdu", "0341234567")).toMatch(/déjà/);
    expect(payoutPhoneIssue("0331234567", "  ok ", "0341234567")).toMatch(/motif/);
    expect(payoutPhoneIssue("0331234567", "Numéro perdu", "0341234567")).toBeNull();
    expect(payoutPhoneIssue("0331234567", "Numéro perdu", null)).toBeNull();
  });
});
