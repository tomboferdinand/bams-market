import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  PASSWORD, createAddress, createUser, loginUI, pool, seedProduct, seedShop,
} from "./helpers";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

let seq = 0;
function freshIdentity() {
  seq += 1;
  const tail = String((Date.now() % 100_000) * 100 + seq).padStart(7, "0").slice(-7);
  return { phone: `038${tail}`, email: `compte.${Date.now()}.${seq}@example.mg` };
}

test.describe("Comptes réels", () => {
  test("inscription avec e-mail + téléphone : compte CLIENT non vérifié et fenêtre de vérification", async ({ page }) => {
    const { phone, email } = freshIdentity();
    await page.goto("/inscription");
    await page.getByLabel("Prénom").fill("Nadia");
    await page.getByLabel("Nom", { exact: true }).fill("Rakoto");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Téléphone").fill(phone);
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirmer le mot de passe").fill(PASSWORD);
    await page.locator("#terms").check({ force: true });
    await page.getByRole("button", { name: "S'inscrire" }).click();

    await expect(page.getByText("Vérifiez votre adresse e-mail")).toBeVisible();
    const { rows } = await pool.query(`SELECT role, "verificationStatus" FROM users WHERE email = $1`, [email]);
    expect(rows[0]).toEqual({ role: "CLIENT", verificationStatus: "NON_VERIFIE" });
  });

  test("inscription sans e-mail : message d'erreur", async ({ page }) => {
    await page.goto("/inscription");
    await page.getByLabel("Prénom").fill("Nadia");
    await page.getByLabel("Nom", { exact: true }).fill("Rakoto");
    await page.getByLabel("Téléphone").fill(freshIdentity().phone);
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirmer le mot de passe").fill(PASSWORD);
    await page.locator("#terms").check({ force: true });
    await page.getByRole("button", { name: "S'inscrire" }).click();
    await expect(page.getByText("E-mail requis.")).toBeVisible();
  });

  test("mot de passe oublié : réponse neutre, même pour une adresse inconnue", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await page.waitForURL("**/mot-de-passe-oublie");
    await page.getByLabel("Email").fill(`inconnu.${Date.now()}@example.mg`);
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByText(/Si un compte existe/)).toBeVisible();
  });

  test("réinitialisation : nouveau mot de passe, puis connexion avec lui", async ({ page }) => {
    const user = await createUser("CLIENT", "Reset");
    const token = `jeton-pw-${Date.now()}`;
    await pool.query(
      `UPDATE users SET "passwordResetTokenHash" = $1, "passwordResetExpiresAt" = now() + interval '1 hour' WHERE id = $2`,
      [sha256(token), user.id],
    );
    await page.goto(`/reinitialiser-mot-de-passe?token=${token}`);
    await page.getByLabel("Nouveau mot de passe").fill("Nouveau1234");
    await page.getByLabel("Confirmer le mot de passe").fill("Nouveau1234");
    await page.getByRole("button", { name: "Réinitialiser le mot de passe" }).click();
    await expect(page.getByText("Mot de passe modifié")).toBeVisible();

    await loginUI(page, { phone: user.phone, password: "Nouveau1234", role: "CLIENT" });
  });

  test("client non vérifié : la fenêtre de vérification s'ouvre de force au moment de commander", async ({ page }) => {
    const owner = await createUser("COMMERCANT", "Marchand");
    const shopId = await seedShop(owner.id, "VALIDEE", `Boutique Verif ${Date.now()}`);
    const productId = await seedProduct(shopId, `Produit Verif ${Date.now()}`);

    const client = await createUser("CLIENT", "Nonverif");
    await pool.query(`UPDATE users SET "verificationStatus" = 'NON_VERIFIE' WHERE id = $1`, [client.id]);
    await createAddress(client, "Maison");

    await loginUI(page, client);
    // La fenêtre s'ouvre à la connexion : on la ferme, comme le ferait un utilisateur pressé.
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Plus tard" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto(`/produits/${productId}`);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier !")).toBeVisible();
    await page.goto("/panier");
    await page.getByRole("button", { name: "Passer commande" }).click();
    await page.waitForURL(/\/commande\/nouvelle\/adresse/);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL(/\/commande\/nouvelle\/recapitulatif/);
    await page.getByRole("button", { name: "Confirmer et procéder au paiement" }).click();

    await expect(page.getByText("Cette action nécessite une adresse e-mail vérifiée.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
