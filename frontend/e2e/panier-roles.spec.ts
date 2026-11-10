import { test, expect } from "@playwright/test";
import { createUser, loginUI, type Role } from "./helpers";

// BR-USR-04 / BR-SEC-03 : l'API du panier est réservée au rôle CLIENT.
// On vérifie l'API directement (pas seulement l'écran) : un appel manuel ne doit pas passer.
const API = "http://localhost:3000/api";

test.describe("Panier : accès réservé aux clients (API)", () => {
  test("un visiteur non connecté est refusé (401)", async ({ request }) => {
    const res = await request.get(`${API}/cart`);
    expect(res.status()).toBe(401);
  });

  for (const role of ["COMMERCANT", "LIVREUR", "ADMINISTRATEUR"] as Role[]) {
    test(`${role} est refusé (403) sur lecture et ajout au panier`, async ({ page }) => {
      const user = await createUser(role, `Panier${role}`);
      await loginUI(page, user);

      const read = await page.request.get(`${API}/cart`);
      expect(read.status()).toBe(403);

      const add = await page.request.post(`${API}/cart/items`, { data: { productId: 1, quantity: 1 } });
      expect(add.status()).toBe(403);
    });
  }

  test("un CLIENT lit son panier (200)", async ({ page }) => {
    const user = await createUser("CLIENT", "PanierClient");
    await loginUI(page, user);

    const res = await page.request.get(`${API}/cart`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });
});
