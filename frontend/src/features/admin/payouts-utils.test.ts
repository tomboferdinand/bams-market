import { describe, it, expect } from "vitest";
import { computePayoutStats, filterPayouts } from "./payouts-utils";
import type { AdminPayout } from "@/types/admin-payout";

const base = {
  phone: "0341234567", error: null, providerReference: null, createdAt: "2026-10-29T10:00:00Z",
};
const mk = (id: number, status: AdminPayout["status"], amount: number, fees: number, first = "Jean", ref = `BAMP-${id}`): AdminPayout => ({
  ...base, id, status, amount, fees, totalDebited: amount + fees, reference: ref,
  user: { id: id + 100, firstName: first, lastName: "Rakoto", role: "COMMERCANT" },
});

const data = [
  mk(1, "REUSSI", 10000, 200),
  mk(2, "REUSSI", 5000, 100, "Mina"),
  mk(3, "EN_ATTENTE", 3000, 60),
  mk(4, "ECHOUE", 8000, 160),
];

describe("payouts-utils", () => {
  it("calcule les totaux : seuls les retraits réussis comptent comme versés", () => {
    expect(computePayoutStats(data)).toEqual({
      paidAmount: 15000, paidFees: 300, paidCount: 2, pendingCount: 1, pendingAmount: 3060, failedCount: 1,
    });
  });

  it("gère une liste vide", () => {
    expect(computePayoutStats([])).toEqual({
      paidAmount: 0, paidFees: 0, paidCount: 0, pendingCount: 0, pendingAmount: 0, failedCount: 0,
    });
  });

  it("filtre par statut", () => {
    expect(filterPayouts(data, "REUSSI", "").map((p) => p.id)).toEqual([1, 2]);
    expect(filterPayouts(data, "", "")).toHaveLength(4);
  });

  it("recherche par nom, numéro ou référence", () => {
    expect(filterPayouts(data, "", "mina").map((p) => p.id)).toEqual([2]);
    expect(filterPayouts(data, "", "BAMP-3").map((p) => p.id)).toEqual([3]);
    expect(filterPayouts(data, "", "034123")).toHaveLength(4);
    expect(filterPayouts(data, "ECHOUE", "mina")).toHaveLength(0);
  });
});
