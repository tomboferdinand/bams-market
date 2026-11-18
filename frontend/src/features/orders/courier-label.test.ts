import { describe, it, expect } from "vitest";
import { courierLabel } from "./courier-label";

describe("courierLabel", () => {
  it("livreur assigné : prénom + nom", () => {
    expect(courierLabel({ assignedCourier: { firstName: "Hery", lastName: "Andria" } })).toBe("Livreur assigné : Hery Andria");
  });
  it("aucun livreur (mission pas encore acceptée ou pas encore créée)", () => {
    expect(courierLabel({ assignedCourier: null })).toBe("En attente d'un livreur");
    expect(courierLabel({})).toBe("En attente d'un livreur");
  });
});
