import { describe, it, expect } from "vitest";
import { orderTab, unpaidDeadline } from "./order-tabs";

describe("orderTab", () => {
    it("range les statuts dans le bon onglet", () => {
        expect(orderTab("EN_ATTENTE_PAIEMENT")).toBe("active");
        expect(orderTab("PAYEE")).toBe("active");
        expect(orderTab("EN_PREPARATION")).toBe("active");
        expect(orderTab("EN_COURS_DE_LIVRAISON")).toBe("active");
        expect(orderTab("LIVREE")).toBe("done");
        expect(orderTab("ANNULEE")).toBe("closed");
        expect(orderTab("ECHOUEE")).toBe("closed");
    });
});

describe("unpaidDeadline", () => {
    it("ajoute 30 minutes à la création", () => {
        const d = unpaidDeadline("2026-11-10T10:00:00.000Z");
        expect(d.toISOString()).toBe("2026-11-10T10:30:00.000Z");
    });
});
