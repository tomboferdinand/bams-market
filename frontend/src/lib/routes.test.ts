import { describe, it, expect } from "vitest";
import { ROLE_HOME } from "./routes";

describe("ROLE_HOME", () => {
  it("redirige chaque rôle vers son espace", () => {
    expect(ROLE_HOME.CLIENT).toBe("/");
    expect(ROLE_HOME.COMMERCANT).toBe("/commercant/dashboard");
    expect(ROLE_HOME.LIVREUR).toBe("/livreur/dashboard");
    expect(ROLE_HOME.ADMINISTRATEUR).toBe("/admin/dashboard");
  });
  it("couvre exactement les 4 rôles", () => {
    expect(Object.keys(ROLE_HOME).sort()).toEqual(["ADMINISTRATEUR", "CLIENT", "COMMERCANT", "LIVREUR"]);
  });
});
