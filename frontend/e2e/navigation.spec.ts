import { test, expect } from "@playwright/test";
import { createUser, loginUI, HOME, type Role } from "./helpers";

const MENU: Record<Role, { label: string; url: string }> = {
  CLIENT: { label: "Mon compte", url: "/profil" },
  COMMERCANT: { label: "Mon espace commerçant", url: "/commercant/dashboard" },
  LIVREUR: { label: "Mon espace livreur", url: "/livreur/dashboard" },
  ADMINISTRATEUR: { label: "Administration", url: "/admin/dashboard" },
};

test.describe("Navigation des utilisateurs connectés", () => {
  for (const role of Object.keys(MENU) as Role[]) {
    test(`${role} : la vitrine reste accessible, le menu de l'avatar mène à son espace, la déconnexion fonctionne`, async ({ page }) => {
      const user = await createUser(role, "Nav");
      await loginUI(page, user);

      // Connexion réussie → loginUI attend déjà l'arrivée dans l'espace du rôle (accueil pour un client).
      expect(new URL(page.url()).pathname).toBe(HOME[role]);

      // Ouvrir simplement la vitrine ne redirige pas : on y reste, toujours connecté.
      await page.goto("/");
      await expect(page).toHaveURL(/localhost:3001\/$/);
      const avatar = page.getByRole("button", { name: "Menu du compte" });
      await expect(avatar).toBeVisible();

      // Le menu propose l'espace de CE rôle, et la déconnexion.
      await avatar.click();
      const menu = page.getByRole("menu");
      await expect(menu.getByRole("menuitem", { name: MENU[role].label })).toBeVisible();
      await expect(menu.getByRole("menuitem", { name: "Déconnexion" })).toBeVisible();
      for (const other of Object.keys(MENU) as Role[]) {
        if (other !== role) await expect(menu.getByRole("menuitem", { name: MENU[other].label })).toHaveCount(0);
      }

      // Aller dans son espace depuis la vitrine.
      await menu.getByRole("menuitem", { name: MENU[role].label }).click();
      await page.waitForURL(`**${MENU[role].url}`);

      // Actualisation : la session est conservée.
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`${MENU[role].url}$`));

      // Retour à la vitrine sans déconnexion, puis déconnexion depuis le menu.
      await page.goto("/");
      await page.getByRole("button", { name: "Menu du compte" }).click();
      await page.getByRole("menuitem", { name: "Déconnexion" }).click();
      await expect(page.getByRole("link", { name: "Connexion" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Menu du compte" })).toHaveCount(0);

      // Après déconnexion, un espace protégé n'est plus accessible.
      if (role !== "CLIENT") {
        await page.goto(MENU[role].url);
        await page.waitForURL("**/connexion**");
      }
    });
  }
});
