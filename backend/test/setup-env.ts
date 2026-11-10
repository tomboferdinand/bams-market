import { config } from 'dotenv';

config({ path: '.env' });
config({ path: '.env.test', override: true });

// Garde-fou : ne jamais exécuter les E2E sur la base de développement.
if (!/test/i.test(process.env.DATABASE_URL ?? '')) {
  throw new Error(
    `E2E refusés : DATABASE_URL doit cibler une base de test (reçu : ${process.env.DATABASE_URL}).`,
  );
}