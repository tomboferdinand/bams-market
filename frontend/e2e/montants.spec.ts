import { test, expect } from "@playwright/test";
import { createUser, createAddress, seedShop, seedProduct, loginUI } from "./helpers";

test.describe.serial("Montants officiels du panier (BR-CMD-01, BR-SEC-02)", () => {
  let client: Awaited<ReturnType<typeof createUser>>;
  let okProductId: number;
  let cheapProductId: number;

  test.beforeAll(async () => {
    client = await createUser("CLIENT", "Montant");
    const merchant = await createUser("COMMERCANT", "Marchand");
    const shopId = await seedShop(merchant.id, "VALIDEE", "Boutique Montants");
    okProductId = await seedProduct(shopId, "Savon E2E", 15000, 10);
    cheapProductId = await seedProduct(shopId, "Bonbon E2E", 1000, 10);
    await createAddress(client, "Domicile Montants");
  });

  test("le panier affiche les frais de livraison et le total", async ({ page }) => {
    await loginUI(page, client);
    await page.goto(`/produits/${okProductId}`);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier !")).toBeVisible();
    await page.goto("/panier");

    await expect(page.getByText("Frais de livraison")).toBeVisible();
    await expect(page.getByText("Total à payer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Passer commande" })).toBeEnabled();
  });

  test("sous le minimum de commande : message et bouton désactivé", async ({ page }) => {
    await loginUI(page, client);
    await page.goto("/panier");
    await page.getByRole("button", { name: "Vider le panier" }).click();
    await page.getByRole("button", { name: "Vider", exact: true }).click();

    await page.goto(`/produits/${cheapProductId}`);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier !")).toBeVisible();
    await page.goto("/panier");

    await expect(page.getByText(/Montant minimum de commande/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Passer commande" })).toBeDisabled();
  });
});
