import { test, expect } from "@playwright/test";
import { createUser, loginUI, pool } from "./helpers";

const uniqueMobile = (prefix: string) => `${prefix}${String((Date.now() + Math.floor(Math.random() * 1000)) % 10_000_000).padStart(7, "0")}`;

test.describe("Numéro de retrait (administration)", () => {
  test("l'admin change le numéro d'un commerçant avec un motif ; la saisie invalide est refusée", async ({ page }) => {
    const admin = await createUser("ADMINISTRATEUR", "Chef");
    const merchant = await createUser("COMMERCANT", "Vendeur");
    const oldPhone = uniqueMobile("032");
    const newPhone = uniqueMobile("033");
    await pool.query(`UPDATE users SET "payoutPhone" = $1 WHERE id = $2`, [oldPhone, merchant.id]);

    await loginUI(page, admin);
    await page.goto("/admin/utilisateurs");
    await page.getByPlaceholder("Nom, e-mail ou téléphone...").fill(merchant.phone);
    const row = page.getByRole("row", { name: new RegExp(merchant.phone) });
    await expect(row).toContainText(oldPhone);

    await row.getByRole("button", { name: "Changer le numéro de retrait" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(oldPhone);

    // saisie invalide : refusée avant tout appel
    await dialog.getByLabel("Nouveau numéro de retrait").fill("12345");
    await dialog.getByLabel("Motif du changement").fill("Numéro perdu");
    await dialog.getByRole("button", { name: "Enregistrer le numéro" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Numéro mobile invalide");

    // saisie valide
    await dialog.getByLabel("Nouveau numéro de retrait").fill(newPhone);
    await dialog.getByRole("button", { name: "Enregistrer le numéro" }).click();
    await expect(page.getByText(`changé en ${newPhone}`)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(row).toContainText(newPhone);

    const { rows } = await pool.query(`SELECT "payoutPhone" FROM users WHERE id = $1`, [merchant.id]);
    expect(rows[0].payoutPhone).toBe(newPhone);
  });

  test("un numéro déjà utilisé par un autre compte est refusé", async ({ page }) => {
    const admin = await createUser("ADMINISTRATEUR", "Chef");
    const a = await createUser("COMMERCANT", "VendeurA");
    const b = await createUser("LIVREUR", "LivreurB");
    const phoneA = uniqueMobile("032");
    await pool.query(`UPDATE users SET "payoutPhone" = $1 WHERE id = $2`, [phoneA, a.id]);

    await loginUI(page, admin);
    await page.goto("/admin/utilisateurs");
    await page.getByPlaceholder("Nom, e-mail ou téléphone...").fill(b.phone);
    await page.getByRole("row", { name: new RegExp(b.phone) }).getByRole("button", { name: "Changer le numéro de retrait" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nouveau numéro de retrait").fill(phoneA);
    await dialog.getByLabel("Motif du changement").fill("Test doublon");
    await dialog.getByRole("button", { name: "Enregistrer le numéro" }).click();
    await expect(dialog.getByRole("alert")).toContainText("déjà");
  });
});
