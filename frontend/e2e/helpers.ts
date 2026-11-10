import { Pool } from "pg";
import { request, expect, type Page } from "@playwright/test";

export const API = "http://localhost:3000/api";
export const PASSWORD = "Test1234!";

const DB_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:root@localhost:5432/bams_market_test";
if (!/test/i.test(new URL(DB_URL).pathname)) {
  throw new Error("E2E refusé : la base ciblée ne contient pas « test » dans son nom.");
}
export const pool = new Pool({ connectionString: DB_URL });
export const dbUrl = DB_URL;

export type Role = "CLIENT" | "COMMERCANT" | "LIVREUR" | "ADMINISTRATEUR";
export const HOME: Record<Role, string> = {
  CLIENT: "/",
  COMMERCANT: "/commercant/dashboard",
  LIVREUR: "/livreur/dashboard",
  ADMINISTRATEUR: "/admin/dashboard",
};

let counter = 0;
function uniquePhone() {
  counter += 1;
  const tail = String((Date.now() % 1_000_000) * 10 + counter).padStart(7, "0").slice(-7);
  return `034${tail}`;
}

export interface TestUser { id: number; phone: string; password: string; role: Role; firstName: string; lastName: string }

export async function createUser(role: Role, firstName: string): Promise<TestUser> {
  const phone = uniquePhone();
  const lastName = "Testeur";
  const api = await request.newContext();
  const res = await api.post(`${API}/auth/register`, {
    data: { firstName, lastName, phone, email: `${phone}@example.mg`, password: PASSWORD },
  });
  expect(res.ok(), `register ${firstName}: ${res.status()} ${await res.text()}`).toBeTruthy();
  await api.dispose();
  const { rows } = await pool.query(
    `UPDATE users SET role = $1, "verificationStatus" = 'VERIFIE' WHERE phone = $2 RETURNING id`,
    [role, phone],
  );
  return { id: rows[0].id, phone, password: PASSWORD, role, firstName, lastName };
}

/** Crée une adresse via l'API pour l'utilisateur (cookie de session propre au contexte). */
export async function createAddress(user: TestUser, label: string) {
  const api = await request.newContext();
  const login = await api.post(`${API}/auth/login`, { data: { identifier: user.phone, password: user.password } });
  expect(login.ok(), `login API: ${login.status()} ${await login.text()}`).toBeTruthy();
  const res = await api.post(`${API}/addresses`, {
    data: { label, fullAddress: "Rue des Tests, Fianarantsoa", phone: "0341234567", isDefault: true },
  });
  expect(res.ok(), `address: ${res.status()} ${await res.text()}`).toBeTruthy();
  await api.dispose();
}

export async function seedShop(ownerId: number, status: "VALIDEE" | "EN_ATTENTE_VALIDATION", name: string) {
  const { rows } = await pool.query(
    `INSERT INTO shops ("ownerId", name, description, address, "contactPhone", status, "updatedAt")
     VALUES ($1, $2, 'Boutique de test', 'Analakely, Fianarantsoa', '0321234567', $3, now()) RETURNING id`,
    [ownerId, name, status],
  );
  return rows[0].id as number;
}

export async function seedProduct(shopId: number, name: string, price = 15000, stock = 10) {
  const cat = await pool.query(
    `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    ["Catégorie E2E"],
  );
  const { rows } = await pool.query(
    `INSERT INTO products ("shopId", "categoryId", name, description, price, stock, status, "isActive", "updatedAt")
     VALUES ($1, $2, $3, 'Produit de test', $4, $5, 'DISPONIBLE', true, now()) RETURNING id`,
    [shopId, cat.rows[0].id, name, price, stock],
  );
  return rows[0].id as number;
}

export async function loginUI(page: Page, user: { phone: string; password: string; role: Role }) {
  await page.goto("/connexion");
  await page.getByLabel("Email ou Téléphone").fill(user.phone);
  await page.getByLabel("Mot de passe").fill(user.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((u) => u.pathname === HOME[user.role]);
}

export async function orderRow(orderId: number) {
  const { rows } = await pool.query(
    `SELECT status, "confirmationCode" FROM orders WHERE id = $1`, [orderId],
  );
  return rows[0] as { status: string; confirmationCode: string | null };
}

export async function placeOrderUI(page: Page, productId: number): Promise<number> {
  await page.goto(`/produits/${productId}`);
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByText("Ajouté au panier !")).toBeVisible();
  await page.goto("/panier");
  await page.getByRole("button", { name: "Passer commande" }).click();
  await page.waitForURL(/\/commande\/nouvelle\/adresse/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/nouvelle\/recapitulatif/);
  await page.getByRole("button", { name: "Confirmer et procéder au paiement" }).click();
  await page.waitForURL(/\/commande\/\d+\/paiement$/);
  return Number(page.url().match(/\/commande\/(\d+)\/paiement/)![1]);
}