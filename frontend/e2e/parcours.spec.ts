import { test, expect } from "@playwright/test";
import {
  createUser, createAddress, seedShop, seedProduct, loginUI, orderRow, pool, type TestUser,
} from "./helpers";

test.describe.serial("Parcours complet : achat → paiement simulé → préparation → livraison", () => {
  let client: TestUser, merchant: TestUser, livreur: TestUser;
  let productId: number;
  let orderId: number;
  const PRODUCT = "Savon artisanal E2E";
  const ADDRESS_LABEL = "Maison E2E";

  test.beforeAll(async () => {
    client = await createUser("CLIENT", "Client");
    merchant = await createUser("COMMERCANT", "Marchand");
    livreur = await createUser("LIVREUR", "Livreur");
    const shopId = await seedShop(merchant.id, "VALIDEE", "Boutique E2E");
    productId = await seedProduct(shopId, PRODUCT, 15000, 10);
    await createAddress(client, ADDRESS_LABEL);
  });
  

  test("1. client : catalogue → produit → panier", async ({ page }) => {
    await loginUI(page, client);
    await page.goto("/catalogue");
    await expect(page.getByText(PRODUCT).first()).toBeVisible();
    await page.goto(`/produits/${productId}`);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier !")).toBeVisible();
    await page.goto("/panier");
    await expect(page.getByRole("heading", { name: "Mon Panier" })).toBeVisible();
    await expect(page.getByText(PRODUCT)).toBeVisible();
  });

  test("2. client : adresse → récapitulatif → paiement simulé", async ({ page }) => {
    await loginUI(page, client);
    await page.goto("/panier");
    await page.getByRole("link", { name: "Passer commande" }).or(
      page.getByRole("button", { name: "Passer commande" }),
    ).click();
    await page.waitForURL(/\/commande\/nouvelle\/adresse/);
    await page.getByText(ADDRESS_LABEL).first().click();           // à confirmer au 1er lancement
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL(/\/commande\/nouvelle\/recapitulatif/);
    await page.getByRole("button", { name: "Confirmer et procéder au paiement" }).click();
    await page.waitForURL(/\/commande\/\d+\/paiement$/);
    orderId = Number(page.url().match(/\/commande\/(\d+)\/paiement/)![1]);

    await expect(page.getByText("Mode simulation (démo)")).toBeVisible();
    await page.getByRole("button", { name: "Simuler un paiement réussi" }).click();
    await page.waitForURL(/\/paiement\/succes/);
    await expect(page.getByText("Merci pour votre commande !")).toBeVisible();
    expect((await orderRow(orderId)).status).toBe("PAYEE");
  });

  test("3. commerçant : voit la commande payée et la prépare", async ({ page }) => {
    await loginUI(page, merchant);
    await page.goto(`/commercant/commandes/${orderId}`);
    await expect(page.getByText(`#CMD-${orderId}`)).toBeVisible();
    await page.getByRole("button", { name: "Marquer comme prête pour expédition" }).click();
    await expect(page.getByText("Action confirmée")).toBeVisible();
    expect((await orderRow(orderId)).status).toBe("EN_PREPARATION");
  });

  test("4. livreur : accepte la mission", async ({ page }) => {
    await loginUI(page, livreur);
    await page.goto("/livreur/missions");
    await expect(page.getByRole("heading", { name: "Missions disponibles" })).toBeVisible();
    await page.getByRole("button", { name: "Accepter" }).first().click();
    await page.goto("/livreur/livraisons");
    await expect(page.getByRole("button", { name: "Confirmer la livraison" })).toBeVisible();
  });

    test("4b. client : voit son code de livraison pendant la livraison", async ({ page }) => {
    const { confirmationCode } = await orderRow(orderId);
    await loginUI(page, client);
    await page.goto(`/commande/${orderId}`);
    await expect(page.getByText("Code de livraison")).toBeVisible();
    await expect(page.getByText(confirmationCode!)).toBeVisible();
  });

  test("5. livreur : un mauvais code est refusé, le bon code termine la livraison", async ({ page }) => {
    const { confirmationCode } = await orderRow(orderId);
    expect(confirmationCode).toMatch(/^\d{6}$/);
    const wrong = confirmationCode === "000000" ? "111111" : "000000";

    await loginUI(page, livreur);
    await page.goto("/livreur/livraisons");
    await page.getByRole("button", { name: "Confirmer la livraison" }).click();
    await page.getByPlaceholder("123456").fill(wrong);
    await page.getByRole("button", { name: "Confirmer", exact: true }).click();
    await expect(page.getByText("Vérification...")).toBeHidden();
    expect((await orderRow(orderId)).status).toBe("EN_COURS_DE_LIVRAISON");

    await page.getByPlaceholder("123456").fill(confirmationCode!);
    await page.getByRole("button", { name: "Confirmer", exact: true }).click();
    await expect(page.getByText("Aucune livraison en cours.")).toBeVisible();
    expect((await orderRow(orderId)).status).toBe("LIVREE");
  });

  test("6. client : voit sa commande livrée", async ({ page }) => {
    await loginUI(page, client);
    await page.goto(`/commande/${orderId}`);
    await expect(page.getByRole("heading", { name: `Commande #${orderId}` })).toBeVisible();
    await expect(page.getByText("Paiement confirmé")).toBeVisible();
  });
});