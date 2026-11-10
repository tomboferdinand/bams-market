import { describe, it, expect } from "vitest";
import { maskPhone } from "./phone-mask";

describe("maskPhone", () => {
  it("garde le début et la fin, masque le milieu", () => {
    expect(maskPhone("0341234567")).toBe("034•••••67");
  });
  it("garde la longueur du numéro", () => {
    expect(maskPhone("0341234567")).toHaveLength(10);
  });
  it("gère le format international", () => {
    expect(maskPhone("+261341234567")).toBe("+26••••••••67");
  });
  it("ne masque pas un numéro trop court", () => {
    expect(maskPhone("12345")).toBe("12345");
  });
  it("ignore les espaces autour", () => {
    expect(maskPhone(" 0341234567 ")).toBe("034•••••67");
  });
});
