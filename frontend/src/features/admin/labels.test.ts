import { describe, it, expect } from "vitest";
import {
  ROLE_LABEL,
  ACCOUNT_STATUS_LABEL,
  SHOP_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  DELIVERY_STATUS_LABEL,
  labelForValue,
} from "./labels";

describe("tables de libellés", () => {
  it("couvrent tous les statuts du backend", () => {
    expect(Object.keys(ROLE_LABEL)).toHaveLength(4);
    expect(Object.keys(ACCOUNT_STATUS_LABEL)).toHaveLength(3);
    expect(Object.keys(SHOP_STATUS_LABEL)).toHaveLength(4);
    expect(Object.keys(ORDER_STATUS_LABEL)).toHaveLength(7);
    expect(Object.keys(PAYMENT_STATUS_LABEL)).toHaveLength(4);
    expect(Object.keys(DELIVERY_STATUS_LABEL)).toHaveLength(4);
  });

  it("n'a aucun libellé vide", () => {
    const all = [
      ROLE_LABEL, ACCOUNT_STATUS_LABEL, SHOP_STATUS_LABEL,
      ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, DELIVERY_STATUS_LABEL,
    ].flatMap((t) => Object.values(t));
    expect(all.every((l) => l.trim().length > 0)).toBe(true);
  });

  it("libellés clés en français", () => {
    expect(ORDER_STATUS_LABEL.EN_ATTENTE_PAIEMENT).toBe("En attente de paiement");
    expect(ORDER_STATUS_LABEL.LIVREE).toBe("Livrée");
    expect(PAYMENT_STATUS_LABEL.VALIDEE).toBe("Confirmé");
    expect(DELIVERY_STATUS_LABEL.ECHEC).toBe("Échec de remise");
  });
});

describe("labelForValue", () => {
  it("traduit une valeur connue", () => {
    expect(labelForValue("EN_PREPARATION")).toBe("En préparation");
    expect(labelForValue("SUSPENDU")).toBe("Suspendu");
  });
  it("renvoie la valeur brute si inconnue", () => {
    expect(labelForValue("VALEUR_INCONNUE")).toBe("VALEUR_INCONNUE");
  });
  it("renvoie un tiret pour null, undefined ou vide", () => {
    expect(labelForValue(null)).toBe("—");
    expect(labelForValue(undefined)).toBe("—");
    expect(labelForValue("")).toBe("—");
  });
});
