import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("fusionne des classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("ignore les valeurs fausses", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
  it("applique les classes conditionnelles", () => {
    expect(cn("a", { b: true, c: false })).toBe("a b");
  });
  it("résout les conflits Tailwind (la dernière gagne)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
