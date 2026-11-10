import { test, expect } from "@playwright/test";
import { createUser, createAddress, seedShop, seedProduct, loginUI, placeOrderUI, pool, type TestUser } from "./helpers";

test.describe.serial("Annulation, échec de paiement, visibilité commerçant", () => {
  let client: TestUser, merchant: TestUser;
  let productId: number;
  const PRODUCT = "Miel E2E";

  test.beforeAll(async () => {
    client = await createUser("CLIENT", "Cli");
    merchant = await createUser("COMMERCANT", "Marc");
    const shopId = await seedShop(merchant.id, "VALIDEE", "Boutique Commandes");
    productId = await seedProduct(shopId, PRODUCT, 15000, 10);
    await createAddress(client, "Domicile E2E");
  });


  test("annulation d'une commande non payée", async ({ page }) => {
    await loginUI(page, client);
    const orderId = await placeOrderUI(page, productId);
    await page.getByRole("link", { name: "Annuler et revoir ma commande" }).click();
    await page.getByRole("button", { name: "Annuler la commande" }).click();
    await page.getByRole("button", { name: "Confirmer l'annulation" }).click();
    await expect(page.getByText("Cette commande a été annulée.")).toBeVisible();
    const { rows } = await pool.query(`SELECT status FROM orders WHERE id = $1`, [orderId]);
    expect(rows[0].status).toBe("ANNULEE");
  });

  test("le commerçant ne voit pas une commande non payée", async ({ page }) => {
    await loginUI(page, client);
    const orderId = await placeOrderUI(page, productId);
    await page.context().clearCookies();
    await loginUI(page, merchant);
    await page.goto(`/commercant/commandes/${orderId}`);
    await expect(page.getByText("Commande introuvable ou ne concernant pas votre boutique.")).toBeVisible();
  });

  test("échec de paiement : sortie proposée et « Commander à nouveau »", async ({ page }) => {
    await page.context().clearCookies();
    await loginUI(page, client);
    const orderId = await placeOrderUI(page, productId);
    await page.getByRole("button", { name: "Simuler un échec" }).click();
    await expect(page.getByText("Le paiement a échoué.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir ma commande" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour au catalogue" })).toBeVisible();
    const pay = await pool.query(`SELECT status FROM payments WHERE "orderId" = $1`, [orderId]);
    expect(pay.rows[0].status).toBe("ECHOUEE");

    await page.getByRole("button", { name: "Commander à nouveau" }).click();
    await page.waitForURL(/\/panier/);
    await expect(page.getByText(PRODUCT)).toBeVisible();
  });
});