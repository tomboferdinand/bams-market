import { test, expect } from "@playwright/test";
import { createUser, createAddress, seedShop, seedProduct, loginUI, placeOrderUI, pool } from "./helpers";

// Page de retour GoalPay : les adresses fixes (/success, /canceled, /failed) affichent l'état réel
// du dernier paiement, jamais une affirmation de l'adresse elle-même.
test.describe("Retour de paiement GoalPay", () => {
  test("annulé → reprise possible ; payé → page de succès ; échoué → message d'échec", async ({ page }) => {
    const stamp = Date.now();
    const merchant = await createUser("COMMERCANT", "MarchandRetour");
    const shopId = await seedShop(merchant.id, "VALIDEE", `Boutique Retour ${stamp}`);
    const productId = await seedProduct(shopId, `Produit Retour ${stamp}`, 15000, 10);
    const client = await createUser("CLIENT", "ClientRetour");
    await createAddress(client, "Maison retour");

    await loginUI(page, client);
    const orderId = await placeOrderUI(page, productId); // paiement initié (simulation), en attente

    // 1. Le client revient de GoalPay sans avoir payé : rien n'est validé, il peut reprendre.
    await page.goto("/canceled");
    await page.waitForURL(/\/paiement\/retour\?r=canceled/);
    await expect(page.getByRole("heading", { name: "Paiement annulé" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reprendre le paiement" })).toHaveAttribute("href", `/commande/${orderId}/paiement`);

    // 2. Même adresse « succès » sans paiement réel : la page ne valide rien (état réel = en attente).
    await page.goto("/transaction/done");
    await expect(page.getByRole("heading", { name: "Vérification de votre paiement…" })).toBeVisible();

    // 3. Le webhook a validé le paiement : la page de retour mène à la confirmation.
    await pool.query(`UPDATE payments SET status = 'VALIDEE' WHERE "orderId" = $1`, [orderId]);
    await pool.query(`UPDATE orders SET status = 'PAYEE' WHERE id = $1`, [orderId]);
    await page.goto("/success");
    await page.waitForURL(new RegExp(`/commande/${orderId}/paiement/succes`));
    await expect(page.getByText("Merci pour votre commande !")).toBeVisible();

    // 4. Paiement échoué côté GoalPay.
    await pool.query(`UPDATE payments SET status = 'ECHOUEE' WHERE "orderId" = $1`, [orderId]);
    await page.goto("/failed");
    await expect(page.getByRole("heading", { name: "Le paiement n'a pas abouti" })).toBeVisible();
  });
});
