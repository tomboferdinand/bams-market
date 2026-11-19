// Inscrit sur la liste blanche GoalPay les numéros de retrait déjà enregistrés (commerçants et livreurs
// activés avant les retraits réels). Idempotent : un numéro déjà inscrit compte comme un succès.
// Facultatif : l'inscription se fait aussi automatiquement au premier aperçu de retrait.
//
// Lecture seule des variables d'environnement (jamais écrites dans un fichier) :
//   DATABASE_URL, GOALPAY_ACCESS_KEY, GOALPAY_WEBHOOK_SECRET, GOALPAY_API_URL (facultatif),
//   GOALPAY_WHITELIST_MAX_AMOUNT (facultatif).
// Usage : npm run whitelist:sync
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { GoalpayPayoutProvider } from '../src/payouts/goalpay-payout.provider';
import { getWhitelistMaxAmount } from '../src/common/payout-config';

async function main() {
  if (!GoalpayPayoutProvider.isConfigured()) {
    throw new Error('GOALPAY_ACCESS_KEY et GOALPAY_WEBHOOK_SECRET sont nécessaires.');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const provider = new GoalpayPayoutProvider();
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['COMMERCANT', 'LIVREUR'] }, payoutPhone: { not: null } },
      select: { id: true, firstName: true, lastName: true, payoutPhone: true },
    });
    let ok = 0;
    for (const u of users) {
      try {
        await provider.ensureWhitelisted(u.payoutPhone!, `${u.firstName} ${u.lastName}`, getWhitelistMaxAmount());
        ok += 1;
      } catch (e) {
        console.error(`Utilisateur ${u.id} : ${(e as Error).message}`);
      }
    }
    console.log(`Liste blanche : ${ok} / ${users.length} numéro(s) inscrit(s) ou déjà présent(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
