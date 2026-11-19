import { test, expect } from "@playwright/test";
import { createUser, loginUI, pool } from "./helpers";

// Retrait en mode simulation (PAYOUT_MODE=simulation dans la config Playwright) : aucun argent réel,
// aucun appel à GoalPay. Vérifie l'affichage : bandeau simulation, solde/plafond, récapitulatif, statut.
test("commerçant : retrait simulé de bout en bout, statut « Réussi » lisible", async ({ page }) => {
  const merchant = await createUser("COMMERCANT", "Retrait");
  const payoutPhone = `034${String(Date.now() % 10_000_000).padStart(7, "0")}`;
  await pool.query(`UPDATE users SET "payoutPhone" = $1 WHERE id = $2`, [payoutPhone, merchant.id]);
  // Gains livrés et retirables (crédit direct du livre de comptes, sans commande).
  // Dates en UTC explicites (colonnes sans fuseau, écrites en UTC par Prisma) : now() côté base serait en heure locale.
  const utc = new Date(Date.now() - 60_000).toISOString().replace("Z", "");
  await pool.query(
    `INSERT INTO wallet_entries ("userId", type, amount, "availableAt", "createdAt") VALUES ($1, 'LIVRAISON', 20000, $2, $2)`,
    [merchant.id, utc],
  );

  await loginUI(page, merchant);
  await page.goto("/commercant/dashboard");

  await expect(page.getByText("Mode simulation : les retraits sont enregistrés mais aucun argent réel n'est versé.")).toBeVisible();
  await expect(page.getByTestId("payout-limits")).toContainText(/Solde disponible\s*:\s*20\s?000\s?MGA/);
  await expect(page.getByTestId("payout-limits")).toContainText("Plafond de retrait sur 24 h");

  await page.getByLabel("Montant à retirer").fill("5000");
  await page.getByRole("button", { name: "Continuer" }).click();
  const recap = page.getByRole("group", { name: "Récapitulatif du retrait" });
  await expect(recap).toContainText(/Vous recevez\s*5\s?000\s?MGA/);
  await expect(recap).toContainText(payoutPhone);
  await expect(recap).toContainText(/Débit total de votre solde\s*:\s*5\s?100\s?MGA/); // frais simulés de 2 %

  await page.getByLabel("Mot de passe de confirmation").fill(merchant.password);
  await page.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(page.getByText(/Retrait de 5\s?000 MGA effectué/)).toBeVisible();
  await expect(page.getByTestId("payout-status").first()).toHaveText("Réussi");

  const { rows } = await pool.query(`SELECT status, "totalDebited" FROM payouts WHERE "userId" = $1`, [merchant.id]);
  expect(rows).toEqual([{ status: "REUSSI", totalDebited: 5100 }]);
});
