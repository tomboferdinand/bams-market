import { describe, it, expect } from "vitest";
import { REQUESTED_ROLE_LABEL, ROLE_REQUEST_STATUS_CLASS, ROLE_REQUEST_STATUS_LABEL } from "./labels";

describe("libellés des demandes de rôle", () => {
  it("couvrent tous les rôles et statuts", () => {
    expect(Object.keys(REQUESTED_ROLE_LABEL).sort()).toEqual(["COMMERCANT", "LIVREUR"]);
    const statuses = ["ANNULEE", "APPROUVEE", "A_ACTIVER", "EN_ATTENTE", "REFUSEE"];
    expect(Object.keys(ROLE_REQUEST_STATUS_LABEL).sort()).toEqual(statuses);
    expect(Object.keys(ROLE_REQUEST_STATUS_CLASS).sort()).toEqual(statuses);
  });
});
