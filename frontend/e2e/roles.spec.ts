import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { createUser, loginUI, pool } from "./helpers";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

test.describe("Demandes de rôle", () => {
  test("un client demande à devenir commerçant, l'admin approuve, le rôle change au clic sur le lien", async ({ page, browser }) => {
    const client = await createUser("CLIENT", "Candidat");
    const admin = await createUser("ADMINISTRATEUR", "Chef");
    const payoutPhone = `033${String(Date.now() % 10_000_000).padStart(7, "0")}`;

    // 1. Le client dépose sa demande depuis son profil.
    await loginUI(page, client);
    await page.goto("/profil");
    await page.getByRole("link", { name: /Devenir commerçant ou livreur/ }).click();
    await page.waitForURL("**/devenir-partenaire");
    await page.getByLabel("Commerçant").check();
    await page.getByLabel("Numéro Mobile Money de retrait").fill(payoutPhone);
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page.getByText("Votre demande est en cours d'examen")).toBeVisible();

    // 2. L'admin l'approuve (autre contexte de navigateur = autre session).
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginUI(adminPage, admin);
    await adminPage.goto("/admin/demandes");
    const row = adminPage.getByRole("row", { name: new RegExp(payoutPhone) });
    await row.getByRole("button", { name: "Approuver" }).click();
    await expect(adminPage.getByText("Aucune demande.")).toBeVisible();
    await adminContext.close();

    // 3. Approuvée mais pas encore activée : le compte reste un client.
    const before = await pool.query(`SELECT role FROM users WHERE id = $1`, [client.id]);
    expect(before.rows[0].role).toBe("CLIENT");
    await page.reload();
    await expect(page.getByText("Demande approuvée : activez votre espace")).toBeVisible();

    // 4. Le client ouvre le lien reçu par e-mail (jeton simulé : le vrai n'existe que dans l'e-mail).
    const token = `jeton-role-${Date.now()}`;
    await pool.query(
      `UPDATE role_requests SET "activationTokenHash" = $1, "activationExpiresAt" = now() + interval '1 day'
       WHERE "userId" = $2 AND status = 'A_ACTIVER'`,
      [sha256(token), client.id],
    );
    await page.goto(`/activer-role?token=${token}`);
    await expect(page.getByText("Espace activé")).toBeVisible();

    const { rows } = await pool.query(`SELECT role, "payoutPhone" FROM users WHERE id = $1`, [client.id]);
    expect(rows[0].role).toBe("COMMERCANT");
    expect(rows[0].payoutPhone).toBe(payoutPhone);

    await page.getByRole("button", { name: "Accéder à mon espace" }).click();
    await page.waitForURL("**/commercant/dashboard");
  });

  test("un lien d'activation invalide affiche une erreur claire", async ({ page }) => {
    await page.goto("/activer-role?token=jeton-totalement-inconnu");
    await expect(page.getByText("Activation impossible")).toBeVisible();
    await expect(page.getByText("Lien d’activation invalide ou expiré.")).toBeVisible();
  });

  test("l'admin refuse avec un motif : le client le voit et peut redemander", async ({ page, browser }) => {
    const client = await createUser("CLIENT", "Refuse");
    const admin = await createUser("ADMINISTRATEUR", "Chef");
    const payoutPhone = `038${String(Date.now() % 10_000_000).padStart(7, "0")}`;

    await loginUI(page, client);
    await page.goto("/devenir-partenaire");
    await page.getByLabel("Livreur").check();
    await page.getByLabel("Numéro Mobile Money de retrait").fill(payoutPhone);
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page.getByText("Votre demande est en cours d'examen")).toBeVisible();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginUI(adminPage, admin);
    await adminPage.goto("/admin/demandes");
    const row = adminPage.getByRole("row", { name: new RegExp(payoutPhone) });
    await row.getByRole("button", { name: "Refuser" }).click();
    await adminPage.getByLabel("Motif du refus").fill("Dossier incomplet");
    await adminPage.getByRole("button", { name: "Confirmer le refus" }).click();
    await expect(adminPage.getByText("Aucune demande.")).toBeVisible();
    await adminContext.close();

    await page.reload();
    await expect(page.getByText("Motif : Dossier incomplet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Envoyer ma demande" })).toBeVisible();
  });
});
