import { describe, it, expect } from "vitest";
import { failureKind } from "./failure-kind";
import type { OrderStatus } from "@/types/order";

const history = (...statuses: OrderStatus[]) =>
  statuses.map((status, i) => ({ id: i + 1, status, changedAt: "2026-11-09T10:00:00.000Z" }));

describe("failureKind", () => {
  it("commande annulée par le client", () => {
    expect(failureKind({ status: "ANNULEE", statusHistory: history("EN_ATTENTE_PAIEMENT", "ANNULEE") })).toBe("cancelled");
  });

  it("paiement échoué : jamais payée", () => {
    expect(failureKind({ status: "ECHOUEE", statusHistory: history("EN_ATTENTE_PAIEMENT", "ECHOUEE") })).toBe("payment");
  });

  it("livraison échouée : la commande avait été payée", () => {
    const statusHistory = history("EN_ATTENTE_PAIEMENT", "PAYEE", "EN_PREPARATION", "EN_COURS_DE_LIVRAISON", "ECHOUEE");
    expect(failureKind({ status: "ECHOUEE", statusHistory })).toBe("delivery");
  });

  it("commande qui suit son cours : aucun échec", () => {
    for (const status of ["EN_ATTENTE_PAIEMENT", "PAYEE", "EN_PREPARATION", "EN_COURS_DE_LIVRAISON", "LIVREE"] as OrderStatus[]) {
      expect(failureKind({ status, statusHistory: history("EN_ATTENTE_PAIEMENT") })).toBeNull();
    }
  });
});
