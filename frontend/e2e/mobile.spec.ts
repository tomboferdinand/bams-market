import { test, expect } from "@playwright/test";
import { createUser, loginUI } from "./helpers";

// Téléphone d'environ 390 px de large : la navigation d'ordinateur est masquée, le menu hamburger la remplace.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.describe("En-tête du site public sur mobile", () => {
  test("visiteur : le menu s'ouvre et mène à la connexion, le panier reste visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Panier" })).toBeVisible();

    const bouton = page.getByRole("button", { name: "Ouvrir le menu" });
    await expect(bouton).toBeVisible();
    await bouton.click();

    const menu = page.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByRole("link", { name: "Catalogue" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Inscription" })).toBeVisible();

    await menu.getByRole("link", { name: "Connexion" }).click();
    await page.waitForURL("**/connexion");
    await expect(page.getByLabel("Email ou Téléphone")).toBeVisible();
    await expect(menu).toHaveCount(0); // le menu se referme après la navigation
  });

  test("client connecté : le menu propose son espace et la déconnexion", async ({ page }) => {
    const user = await createUser("CLIENT", "Mobile");
    await loginUI(page, user);
    await page.goto("/");

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByRole("link", { name: "Mes Commandes" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Connexion" })).toHaveCount(0);

    await menu.getByRole("link", { name: "Mon compte" }).click();
    await page.waitForURL("**/profil");

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("navigation", { name: "Menu principal" }).getByRole("button", { name: "Déconnexion" }).click();
    await page.waitForURL((u) => u.pathname === "/");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await expect(page.getByRole("navigation", { name: "Menu principal" }).getByRole("link", { name: "Connexion" })).toBeVisible();
  });
});
