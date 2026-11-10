import { describe, it, expect } from "vitest";
import { productSchema } from "./schemas";

const messages = (r: ReturnType<typeof productSchema.safeParse>) =>
  r.success ? [] : r.error.issues.map((i) => i.message);

describe("productSchema", () => {
  const base = {
    name: "Riz local",
    description: "Riz de Fianarantsoa",
    price: "1500",
    stock: "10",
    categoryId: "2",
  };

  it("convertit les chaînes du formulaire en nombres", () => {
    const r = productSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.price).toBe(1500);
      expect(r.data.stock).toBe(10);
      expect(r.data.categoryId).toBe(2);
    }
  });

  it("refuse un prix à 0 ou négatif", () => {
    expect(messages(productSchema.safeParse({ ...base, price: "0" }))).toContain(
      "Le prix doit être supérieur à 0.",
    );
    expect(productSchema.safeParse({ ...base, price: "-5" }).success).toBe(false);
  });

  it("refuse un prix décimal", () => {
    expect(productSchema.safeParse({ ...base, price: "12.5" }).success).toBe(false);
  });

  it("accepte un stock à 0 mais refuse un stock négatif", () => {
    expect(productSchema.safeParse({ ...base, stock: "0" }).success).toBe(true);
    expect(messages(productSchema.safeParse({ ...base, stock: "-1" }))).toContain(
      "Le stock ne peut pas être négatif.",
    );
  });

  it("exige une catégorie", () => {
    expect(messages(productSchema.safeParse({ ...base, categoryId: "0" }))).toContain(
      "Choisissez une catégorie.",
    );
  });

  it("refuse un nom ou une description trop courts", () => {
    const r = productSchema.safeParse({ ...base, name: "R", description: "abc" });
    expect(messages(r)).toEqual(
      expect.arrayContaining(["Nom trop court.", "Description trop courte."]),
    );
  });
});
