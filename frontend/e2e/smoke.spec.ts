import { expect, test } from "@playwright/test";

test("le backend de test répond", async ({ request }) => {
  const res = await request.get("http://localhost:3000/api/products");
  expect(res.status()).toBe(200);
});

test("les pages publiques se chargent", async ({ page }) => {
  for (const path of ["/", "/connexion", "/inscription", "/catalogue"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBeLessThan(400);
  }
});