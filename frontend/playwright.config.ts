import { defineConfig, devices } from "@playwright/test";

const TEST_DB =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:root@localhost:5432/bams_market_test";

// Garde-fou : jamais sur la base de développement.
if (!/test/i.test(TEST_DB)) {
  throw new Error(`E2E refusés : la base doit contenir "test" (reçu : ${TEST_DB}).`);
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1, // les parcours partagent une même base
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3001",
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Backend compilé, branché sur la base de test, toujours en simulation (paiements et retraits),
      // sans envoi d'e-mail réel et sans limitation par IP, quel que soit le contenu de backend/.env
      command: "npm run start:prod",
      cwd: "../backend",
      url: "http://localhost:3000/api/products",
      env: {
        DATABASE_URL: TEST_DB,
        NODE_ENV: "test",
        PAYMENT_MODE: "simulation",
        PAYOUT_MODE: "simulation",
        SMTP_HOST: "",
        RATE_LIMIT_DISABLED: "true",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // Frontend compilé (npm run build requis avant)
      command: "npm run start",
      url: "http://localhost:3001",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
