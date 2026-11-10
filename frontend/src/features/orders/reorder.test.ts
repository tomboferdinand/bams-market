import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/cart.service", () => ({
  addCartItem: vi.fn(),
}));

import { addCartItem } from "@/services/cart.service";
import { reorderItems } from "./reorder";

const mockAdd = vi.mocked(addCartItem);

const item = (productId: number, quantity: number, name: string) => ({
  productId,
  quantity,
  product: { name },
});

const orderOf = (...items: ReturnType<typeof item>[]) => ({ items } as never);

describe("reorderItems", () => {
  beforeEach(() => {
    mockAdd.mockReset();
  });

  it("ajoute chaque article avec sa quantité", async () => {
    mockAdd.mockResolvedValue({} as never);
    const result = await reorderItems(orderOf(item(1, 2, "Riz"), item(2, 5, "Huile")));

    expect(mockAdd).toHaveBeenCalledTimes(2);
    expect(mockAdd).toHaveBeenNthCalledWith(1, 1, 2);
    expect(mockAdd).toHaveBeenNthCalledWith(2, 2, 5);
    expect(result).toEqual({ added: 2, skipped: [] });
  });

  it("continue et signale les produits refusés par l'API", async () => {
    mockAdd
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error("Stock insuffisant"))
      .mockResolvedValueOnce({} as never);

    const result = await reorderItems(
      orderOf(item(1, 1, "Riz"), item(2, 1, "Huile"), item(3, 1, "Sucre")),
    );

    expect(mockAdd).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ added: 2, skipped: ["Huile"] });
  });

  it("renvoie added = 0 si tout est refusé", async () => {
    mockAdd.mockRejectedValue(new Error("Indisponible"));
    const result = await reorderItems(orderOf(item(1, 1, "Riz"), item(2, 1, "Huile")));
    expect(result).toEqual({ added: 0, skipped: ["Riz", "Huile"] });
  });

  it("ne fait aucun appel pour une commande sans article", async () => {
    const result = await reorderItems(orderOf());
    expect(mockAdd).not.toHaveBeenCalled();
    expect(result).toEqual({ added: 0, skipped: [] });
  });
});
