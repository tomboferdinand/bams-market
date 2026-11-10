import { test, expect } from "@playwright/test";
import { createUser, loginUI, pool, HOME, type Role } from "./helpers";



for (const role of ["CLIENT", "COMMERCANT", "LIVREUR", "ADMINISTRATEUR"] as Role[]) {
  test(`connexion ${role} → redirection vers son espace`, async ({ page }) => {
    const user = await createUser(role, `Auth${role}`);
    await loginUI(page, user);
    expect(new URL(page.url()).pathname).toBe(HOME[role]);
  });
}

test("mauvais mot de passe → on reste sur /connexion", async ({ page }) => {
  const user = await createUser("CLIENT", "Mauvais");
  await page.goto("/connexion");
  await page.getByLabel("Email ou Téléphone").fill(user.phone);
  await page.getByLabel("Mot de passe").fill("Mauvais123!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/connexion/);
});

test("un client ne peut pas rester sur l'espace admin ni livreur", async ({ page }) => {
  const user = await createUser("CLIENT", "Intrus");
  await loginUI(page, user);
  await page.goto("/admin/dashboard");
  await expect(page).not.toHaveURL(/\/admin\//);
  await page.goto("/livreur/missions");
  await expect(page).not.toHaveURL(/\/livreur\//);
});

test("un visiteur non connecté est renvoyé hors de l'espace commerçant", async ({ page }) => {
  await page.goto("/commercant/dashboard");
  await expect(page).not.toHaveURL(/\/commercant\//);
});