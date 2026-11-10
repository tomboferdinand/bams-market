import { test, expect } from "@playwright/test";
import { API, createUser, loginUI, seedProduct, seedShop } from "./helpers";

// BR-CMD-07 : un panier = une boutique. Le panier n'est jamais vidé sans l'accord du client.
test.describe("Panier : une seule boutique à la fois", () => {
  test("produit d'une autre boutique : question au client, rien n'est vidé tant qu'il n'accepte pas", async ({ page }) => {
    const stamp = Date.now();
    const merchantA = await createUser("COMMERCANT", "MarchandA");
    const merchantB = await createUser("COMMERCANT", "MarchandB");
    const shopA = await seedShop(merchantA.id, "VALIDEE", `Boutique A ${stamp}`);
    const shopB = await seedShop(merchantB.id, "VALIDEE", `Boutique B ${stamp}`);
    const productA = await seedProduct(shopA, `Produit A ${stamp}`);
    const productB = await seedProduct(shopB, `Produit B ${stamp}`);

    const client = await createUser("CLIENT", "ClientBoutique");
    await loginUI(page, client);

    // 1. Ajout d'un produit de la boutique A : accepté.
    await page.goto(`/produits/${productA}`);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier !")).toBeVisible();

    // 2. Ajout d'un produit de la boutique B : le client est interrogé, le panier n'a pas changé.
    await page.goto(`/produits/${productB}`);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Produits d'une autre boutique")).toBeVisible();
    await expect(page.getByText(`Boutique A ${stamp}`).first()).toBeVisible();

    const before = await (await page.request.get(`${API}/cart`)).json();
    expect(before.items).toHaveLength(1);
    expect(before.items[0].productId).toBe(productA);

    // 3. Le client accepte explicitement : le panier ne contient plus que le produit B.
    await page.getByRole("button", { name: "Vider le panier et ajouter" }).click();
    await expect(page.getByText("Ajouté au panier !")).toBeVisible();

    const after = await (await page.request.get(`${API}/cart`)).json();
    expect(after.items).toHaveLength(1);
    expect(after.items[0].productId).toBe(productB);
  });

  test("l'API refuse (409) un mélange de boutiques, même par un appel direct", async ({ page }) => {
    const stamp = Date.now();
    const merchantA = await createUser("COMMERCANT", "MarchandC");
    const merchantB = await createUser("COMMERCANT", "MarchandD");
    const productA = await seedProduct(await seedShop(merchantA.id, "VALIDEE", `Boutique C ${stamp}`), `Produit C ${stamp}`);
    const productB = await seedProduct(await seedShop(merchantB.id, "VALIDEE", `Boutique D ${stamp}`), `Produit D ${stamp}`);

    const client = await createUser("CLIENT", "ClientDirect");
    await loginUI(page, client);

    const first = await page.request.post(`${API}/cart/items`, { data: { productId: productA, quantity: 1 } });
    expect([200, 201]).toContain(first.status());

    const second = await page.request.post(`${API}/cart/items`, { data: { productId: productB, quantity: 1 } });
    expect(second.status()).toBe(409);

    const cart = await (await page.request.get(`${API}/cart`)).json();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].productId).toBe(productA);
  });
});
