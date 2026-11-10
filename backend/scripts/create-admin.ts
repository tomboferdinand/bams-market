// Crée (ou remet à jour) le compte administrateur à partir du .env. À lancer à la main, une seule fois :
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... (dans backend/.env)  puis  npm run create-admin
// Il n'existe aucune route publique pour devenir administrateur.
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const phoneRaw = process.env.ADMIN_PHONE?.replace(/[\s.\-()]/g, '');
  const firstName = process.env.ADMIN_FIRST_NAME?.trim() || 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME?.trim() || 'Bam’S Market';

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('ADMIN_EMAIL manquant ou invalide.');
  if (!password || !PASSWORD_REGEX.test(password)) {
    throw new Error('ADMIN_PASSWORD manquant ou trop faible (8 caractères, majuscule, minuscule, chiffre).');
  }
  const phoneMatch = phoneRaw ? /^(?:\+?261|0)(3[2348]\d{7})$/.exec(phoneRaw) : null;
  if (phoneRaw && !phoneMatch) throw new Error('ADMIN_PHONE invalide (ex : 0341234567).');
  const phone = phoneMatch ? `0${phoneMatch[1]}` : undefined;

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: 'ADMINISTRATEUR', accountStatus: 'ACTIF', verificationStatus: 'VERIFIE', passwordHash,
          loginAttempts: 0, loginLockedUntil: null,
        },
      });
      console.log(`Compte existant promu administrateur : ${email} (id ${existing.id}).`);
    } else {
      const created = await prisma.user.create({
        data: {
          email, phone, firstName, lastName, passwordHash,
          role: 'ADMINISTRATEUR', accountStatus: 'ACTIF', verificationStatus: 'VERIFIE',
        },
      });
      console.log(`Administrateur créé : ${email} (id ${created.id}).`);
    }
    console.log('Pensez à retirer ADMIN_PASSWORD du fichier .env.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
