import { describe, it, expect } from "vitest";
import { PHONE_REGEX, PASSWORD_REGEX } from "./auth";

describe("PHONE_REGEX (BR-USR-02)", () => {
  it.each(["0321234567", "0331234567", "0341234567", "0381234567", "+261341234567"])(
    "accepte %s",
    (phone) => expect(PHONE_REGEX.test(phone)).toBe(true),
  );
  it.each([
    ["préfixe inconnu", "0351234567"],
    ["trop court", "034123456"],
    ["trop long", "03412345678"],
    ["lettres", "034abcdefg"],
    ["vide", ""],
    ["sans zéro ni indicatif", "341234567"],
  ])("refuse : %s", (_label, phone) => expect(PHONE_REGEX.test(phone)).toBe(false));
});

describe("PASSWORD_REGEX (BR-USR-03)", () => {
  it("accepte minuscule + majuscule + chiffre", () => {
    expect(PASSWORD_REGEX.test("Test1234!")).toBe(true);
  });
  it.each([
    ["sans majuscule", "test1234"],
    ["sans minuscule", "TEST1234"],
    ["sans chiffre", "TestTest"],
  ])("refuse : %s", (_label, pwd) => expect(PASSWORD_REGEX.test(pwd)).toBe(false));
});
