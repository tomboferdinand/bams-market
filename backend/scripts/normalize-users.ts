// Met en forme les e-mails (minuscules) et téléphones (03XXXXXXXX) des comptes existants.
//   npm run normalize-users           → simulation, affiche ce qui changerait
//   npm run normalize-users -- --apply → applique
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const MG_MOBILE = /^(?:\+?261|0)(3[2348]\d{7})$/;

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, phone: true } });
    const emails = new Map(users.filter((u) => u.email).map((u) => [u.email as string, u.id]));
    const phones = new Map(users.filter((u) => u.phone).map((u) => [u.phone as string, u.id]));
    let changed = 0;
    let skipped = 0;

    for (const u of users) {
      const data: { email?: string; phone?: string } = {};
      if (u.email && u.email !== u.email.trim().toLowerCase()) data.email = u.email.trim().toLowerCase();
      if (u.phone) {
        const m = MG_MOBILE.exec(u.phone.replace(/[\s.\-()]/g, ''));
        if (m && u.phone !== `0${m[1]}`) data.phone = `0${m[1]}`;
      }
      if (!data.email && !data.phone) continue;

      const clash =
        (data.email && emails.has(data.email) && emails.get(data.email) !== u.id) ||
        (data.phone && phones.has(data.phone) && phones.get(data.phone) !== u.id);
      if (clash) {
        console.log(`#${u.id} IGNORÉ (doublon avec un autre compte) : ${JSON.stringify(data)}`);
        skipped++;
        continue;
      }
      console.log(`#${u.id} ${u.email ?? '-'} / ${u.phone ?? '-'}  →  ${JSON.stringify(data)}`);
      if (apply) await prisma.user.update({ where: { id: u.id }, data });
      changed++;
    }
    console.log(`${changed} compte(s) ${apply ? 'modifié(s)' : 'à modifier'}, ${skipped} ignoré(s).${apply ? '' : ' (simulation : ajoutez --apply)'}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
