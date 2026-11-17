import { test, expect } from "@playwright/test";
import { API, createUser, createAddress, seedShop, seedProduct, loginUI, placeOrderUI, pool, type TestUser } from "./helpers";

// Livraison échouée après paiement : le client peut contacter l'administration, le commerçant voit la
// commande (filtre « Échouées », stock restitué), mais jamais une commande dont le PAIEMENT a échoué.
test.describe.serial("Livraison échouée", () => {
  let client: TestUser, merchant: TestUser, livreur: TestUser;
  let productId: number;
  let failedDeliveryOrder: number;
  let failedPaymentOrder: number;

  test.beforeAll(async () => {
    const stamp = Date.now();
    client = await createUser("CLIENT", "CliEchec");
    merchant = await createUser("COMMERCANT", "MarcEchec");
    livreur = await createUser("LIVREUR", "LivEchec");
    const shopId = await seedShop(merchant.id, "VALIDEE", `Boutique Échec ${stamp}`);
    productId = await seedProduct(shopId, `Produit Échec ${stamp}`, 15000, 10);
    await createAddress(client, "Domicile échec");
  });

  test("préparation : une commande payée puis livraison échouée, une autre au paiement échoué", async ({ page, browser }) => {
    await loginUI(page, client);
    failedDeliveryOrder = await placeOrderUI(page, productId);
    await page.getByRole("button", { name: "Simuler un paiement réussi" }).click();
    await page.waitForURL(/\/paiement\/succes/);

    failedPaymentOrder = await placeOrderUI(page, productId);
    await page.getByRole("button", { name: "Simuler un échec" }).click();
    await expect(page.getByText("Le paiement a échoué.")).toBeVisible();

    const m = await (await browser.newContext()).newPage();
    await loginUI(m, merchant);
    await m.goto(`/commercant/commandes/${failedDeliveryOrder}`);
    await m.getByRole("button", { name: "Marquer comme prête pour expédition" }).click();
    await expect(m.getByText("Action confirmée")).toBeVisible();

    const l = await (await browser.newContext()).newPage();
    await loginUI(l, livreur);
    // Acceptation de CETTE mission précisément (d'autres missions de test peuvent être disponibles).
    const mission = await pool.query(`SELECT id FROM deliveries WHERE "orderId" = $1`, [failedDeliveryOrder]);
    const accept = await l.request.patch(`${API}/deliveries/${mission.rows[0].id}/accept`);
    expect(accept.ok()).toBe(true);
    await l.goto("/livreur/livraisons");
    await l.getByRole("button", { name: "Signaler un échec de livraison" }).click();
    await l.getByRole("button", { name: "Signaler l'échec" }).click();
    await expect(l.getByText("Aucune livraison en cours.")).toBeVisible();

    const { rows } = await pool.query(`SELECT status FROM orders WHERE id = $1`, [failedDeliveryOrder]);
    expect(rows[0].status).toBe("ECHOUEE");
  });

  test("client : bouton « Contacter l'administration » avec le numéro de commande", async ({ page }) => {
    await loginUI(page, client);
    await page.goto(`/commande/${failedDeliveryOrder}`);
    await expect(page.getByText("La livraison de cette commande n'a pas pu être effectuée.")).toBeVisible();
    const contact = page.getByRole("link", { name: "Contacter l'administration" });
    // Affiché seulement si NEXT_PUBLIC_SUPPORT_EMAIL est défini au moment du build.
    if (await contact.count()) {
      const href = (await contact.getAttribute("href"))!;
      expect(href.startsWith("mailto:")).toBe(true);
      expect(decodeURIComponent(href)).toContain(`Remboursement commande #${failedDeliveryOrder}`);
    }
  });

  test("commerçant : la commande échouée apparaît dans « Toutes » et « Échouées », pas le paiement échoué", async ({ page }) => {
    await loginUI(page, merchant);
    await page.goto("/commercant/commandes");
    await expect(page.getByText(`#CMD-${failedDeliveryOrder}`)).toBeVisible();
    await expect(page.getByText(`#CMD-${failedPaymentOrder}`)).toHaveCount(0);

    await page.getByRole("button", { name: "Échouées" }).click();
    await expect(page.getByText(`#CMD-${failedDeliveryOrder}`)).toBeVisible();

    await page.goto(`/commercant/commandes/${failedDeliveryOrder}`);
    await expect(page.getByTestId("failed-order-note")).toContainText("Le stock des articles a été restitué");

    await page.goto(`/commercant/commandes/${failedPaymentOrder}`);
    await expect(page.getByText("Commande introuvable ou ne concernant pas votre boutique.")).toBeVisible();
  });
});
