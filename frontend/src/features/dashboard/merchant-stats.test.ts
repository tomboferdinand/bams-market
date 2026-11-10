import { describe, it, expect } from "vitest";
import { computeMerchantStats, shopAmount, PAID_STATUSES } from "./merchant-stats";
import type { MerchantOrder, OrderStatus } from "@/types/order";
import type { Product } from "@/types/product";

function order(
  id: number,
  status: OrderStatus,
  createdAt: string,
  lines: Array<[number, number]> = [[1000, 1]],
): MerchantOrder {
  return {
    id,
    status,
    createdAt,
    items: lines.map(([unitPrice, quantity], i) => ({ id: id * 100 + i, unitPrice, quantity })),
  } as unknown as MerchantOrder;
}

function product(id: number, isActive: boolean, status: string): Product {
  return { id, isActive, status } as unknown as Product;
}

describe("shopAmount", () => {
  it("additionne prix × quantité des articles de la boutique", () => {
    expect(shopAmount(order(1, "PAYEE", "2026-01-01", [[1000, 2], [500, 3]]))).toBe(3500);
  });
  it("vaut 0 sans article", () => {
    expect(shopAmount(order(1, "PAYEE", "2026-01-01", []))).toBe(0);
  });
});

describe("PAID_STATUSES", () => {
  it("n'inclut ni les commandes impayées ni les annulées", () => {
    expect(PAID_STATUSES).toEqual(["PAYEE", "EN_PREPARATION", "EN_COURS_DE_LIVRAISON", "LIVREE"]);
  });
});

describe("computeMerchantStats", () => {
  it("renvoie des zéros sans données", () => {
    expect(computeMerchantStats([], [])).toEqual({
      activeProducts: 0,
      outOfStock: 0,
      paidOrders: 0,
      toPrepare: 0,
      revenue: 0,
      recentOrders: [],
    });
  });

  it("compte produits actifs et ruptures (uniquement parmi les actifs)", () => {
    const stats = computeMerchantStats(
      [
        product(1, true, "DISPONIBLE"),
        product(2, true, "RUPTURE_DE_STOCK"),
        product(3, false, "RUPTURE_DE_STOCK"), // désactivé : ne compte pas
        product(4, false, "DISPONIBLE"),
      ],
      [],
    );
    expect(stats.activeProducts).toBe(2);
    expect(stats.outOfStock).toBe(1);
  });

  it("ignore les commandes non payées, annulées ou échouées", () => {
    const stats = computeMerchantStats([], [
      order(1, "EN_ATTENTE_PAIEMENT", "2026-01-01"),
      order(2, "ANNULEE", "2026-01-02"),
      order(3, "ECHOUEE", "2026-01-03"),
      order(4, "PAYEE", "2026-01-04"),
    ]);
    expect(stats.paidOrders).toBe(1);
    expect(stats.revenue).toBe(1000);
  });

  it("toPrepare ne compte que les commandes PAYEE", () => {
    const stats = computeMerchantStats([], [
      order(1, "PAYEE", "2026-01-01"),
      order(2, "EN_PREPARATION", "2026-01-02"),
      order(3, "LIVREE", "2026-01-03"),
    ]);
    expect(stats.paidOrders).toBe(3);
    expect(stats.toPrepare).toBe(1);
  });

  it("calcule le chiffre d'affaires sur la part de la boutique", () => {
    const stats = computeMerchantStats([], [
      order(1, "PAYEE", "2026-01-01", [[1000, 2]]),
      order(2, "LIVREE", "2026-01-02", [[500, 4], [100, 1]]),
    ]);
    expect(stats.revenue).toBe(2000 + 2100);
  });

  it("dédoublonne les commandes par identifiant", () => {
    const o = order(7, "PAYEE", "2026-01-01");
    const stats = computeMerchantStats([], [o, o, order(7, "PAYEE", "2026-01-01")]);
    expect(stats.paidOrders).toBe(1);
    expect(stats.revenue).toBe(1000);
  });

  it("garde les 5 commandes payées les plus récentes, la plus récente d'abord", () => {
    const orders = Array.from({ length: 7 }, (_, i) =>
      order(i + 1, "PAYEE", `2026-01-0${i + 1}T10:00:00`),
    );
    const stats = computeMerchantStats([], orders);
    expect(stats.recentOrders.map((o) => o.id)).toEqual([7, 6, 5, 4, 3]);
  });

  it("n'altère pas le tableau fourni", () => {
    const orders = [order(1, "PAYEE", "2026-01-01"), order(2, "PAYEE", "2026-01-02")];
    computeMerchantStats([], orders);
    expect(orders.map((o) => o.id)).toEqual([1, 2]);
  });
});
