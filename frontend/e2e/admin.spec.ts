import { test, expect } from "@playwright/test";
import { createUser, seedShop, loginUI, pool } from "./helpers";



test("admin : valide une boutique en attente", async ({ page }) => {
  const admin = await createUser("ADMINISTRATEUR", "Admin");
  const owner = await createUser("COMMERCANT", "Patron");
  const shopId = await seedShop(owner.id, "EN_ATTENTE_VALIDATION", "Boutique à valider");

  await loginUI(page, admin);
  await page.goto("/admin/boutiques");
  await expect(page.getByRole("heading", { name: "Validation des Boutiques" })).toBeVisible();
  await expect(page.getByText("Boutique à valider")).toBeVisible();
  await page.getByRole("button", { name: "Valider" }).first().click();
  // l'onglet « En attente » doit se vider de cette boutique
  await expect(page.getByText("Boutique à valider")).toBeHidden();
  await expect
    .poll(async () => (await pool.query(`SELECT status FROM shops WHERE id = $1`, [shopId])).rows[0].status)
    .toBe("VALIDEE");
});