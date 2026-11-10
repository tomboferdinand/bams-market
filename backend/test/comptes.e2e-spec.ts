import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/auth/tokens';

// Aucun e-mail réel pendant les tests (le lien est simplement journalisé) et pas de limitation par IP.
process.env.SMTP_HOST = '';
process.env.RATE_LIMIT_DISABLED = 'true';

const PASSWORD = 'Test1234';
const rand = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
// Jetons uniques à chaque exécution : la base de test garde les données précédentes (colonnes uniques).
const RUN = `${Date.now()}${rand(4)}`;

describe('Comptes réels (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;

  const newIdentity = () => ({ digits: rand(7), stamp: `${Date.now()}${rand(3)}` });

  async function register(extra: Record<string, unknown> = {}) {
    const { digits, stamp } = newIdentity();
    const email = `E2E.${stamp}@Exemple.MG`;
    const body = { firstName: 'E2E', lastName: 'Compte', email, phone: `+261 34 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`, password: PASSWORD, ...extra };
    const res = await request(server).post('/api/auth/register').send(body);
    return { res, body, email: email.toLowerCase(), phone: `034${digits}` };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('l’inscription normalise l’e-mail et le téléphone et crée toujours un CLIENT non vérifié', async () => {
    const { res, email, phone } = await register({ role: 'ADMINISTRATEUR' });
    expect(res.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user!.phone).toBe(phone);
    expect(user!.role).toBe('CLIENT');
    expect(user!.verificationStatus).toBe('NON_VERIFIE');
    // seule l’empreinte du jeton est stockée
    expect(user!.verificationToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuse un doublon écrit autrement (majuscules, +261)', async () => {
    const first = await register();
    expect(first.res.status).toBe(201);
    const dup = await request(server).post('/api/auth/register').send({
      firstName: 'E2E', lastName: 'Doublon', email: first.email.toUpperCase(), phone: `034${rand(7)}`, password: PASSWORD,
    });
    expect(dup.status).toBe(409);
    const dupPhone = await request(server).post('/api/auth/register').send({
      firstName: 'E2E', lastName: 'Doublon', email: `autre.${Date.now()}${rand(3)}@exemple.mg`, phone: `+261${first.phone.slice(1)}`, password: PASSWORD,
    });
    expect(dupPhone.status).toBe(409);
  });

  it('refuse une inscription sans e-mail ou sans téléphone (400)', async () => {
    const { digits, stamp } = newIdentity();
    const base = { firstName: 'E2E', lastName: 'Manque', password: PASSWORD };
    await request(server).post('/api/auth/register').send({ ...base, phone: `034${digits}` }).expect(400);
    await request(server).post('/api/auth/register').send({ ...base, email: `manque.${stamp}@exemple.mg` }).expect(400);
  });

  it('un client dont l’e-mail n’est pas vérifié ne peut ni commander, ni payer, ni retirer de l’argent (403)', async () => {
    const { email } = await register();
    const agent = request.agent(server);
    await agent.post('/api/auth/login').send({ identifier: email, password: PASSWORD }).expect(200);
    const expected = 'Vérifiez votre adresse e-mail pour effectuer cette action.';
    const order = await agent.post('/api/orders').send({ addressId: 1 });
    expect(order.status).toBe(403);
    expect(order.body.message).toBe(expected);
    const pay = await agent.post('/api/payments').send({ orderId: 1 });
    expect(pay.status).toBe(403);
    expect(pay.body.message).toBe(expected);
    await agent.post('/api/payouts').send({ amount: 5000, password: PASSWORD }).expect(403);
  });

  it('GET /auth/me ne renvoie aucun secret', async () => {
    const { email } = await register();
    const agent = request.agent(server);
    await agent.post('/api/auth/login').send({ identifier: email, password: PASSWORD }).expect(200);
    const me = await agent.get('/api/auth/me').expect(200);
    for (const k of ['passwordHash', 'verificationToken', 'passwordResetTokenHash', 'payoutAuthAttempts', 'payoutAuthLockedUntil', 'loginAttempts']) {
      expect(me.body).not.toHaveProperty(k);
    }
  });

  it('se connecte avec l’e-mail en majuscules ou le téléphone en +261', async () => {
    const { email, phone } = await register();
    const byEmail = await request(server).post('/api/auth/login').send({ identifier: email.toUpperCase(), password: PASSWORD });
    expect(byEmail.status).toBe(200);
    const byPhone = await request(server).post('/api/auth/login').send({ identifier: `+261${phone.slice(1)}`, password: PASSWORD });
    expect(byPhone.status).toBe(200);
  });

  it('vérifie l’e-mail avec le lien (jeton à usage unique)', async () => {
    const { email } = await register();
    await prisma.user.update({
      where: { email },
      data: { verificationToken: hashToken(`jeton-e2e-verif-${RUN}`), verificationTokenExpiresAt: new Date(Date.now() + 60_000) },
    });
    await request(server).get(`/api/auth/verify-email?token=jeton-e2e-verif-${RUN}`).expect(200);
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.verificationStatus).toBe('VERIFIE');
    expect(user!.verificationToken).toBeNull();
    await request(server).get(`/api/auth/verify-email?token=jeton-e2e-verif-${RUN}`).expect(400);
    await request(server).get('/api/auth/verify-email').expect(400);
  });

  it('changer d’e-mail dans le profil repasse le compte en non vérifié', async () => {
    const { email } = await register();
    await prisma.user.update({ where: { email }, data: { verificationStatus: 'VERIFIE' } });
    const agent = request.agent(server);
    await agent.post('/api/auth/login').send({ identifier: email, password: PASSWORD }).expect(200);
    const newEmail = `nouveau.${Date.now()}${rand(3)}@exemple.mg`;
    const res = await agent.patch('/api/users/me').send({ email: newEmail.toUpperCase() });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(newEmail);
    expect(res.body.verificationStatus).toBe('NON_VERIFIE');
  });

  describe('mot de passe oublié', () => {
    it('répond pareil pour une adresse inconnue (200) et ne crée aucun jeton', async () => {
      const res = await request(server).post('/api/auth/forgot-password').send({ email: `inconnu.${Date.now()}@exemple.mg` });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejette une adresse mal formée (400)', async () => {
      await request(server).post('/api/auth/forgot-password').send({ email: 'pas-un-email' }).expect(400);
    });

    it('parcours complet : demande, réinitialisation, ancien mot de passe refusé, lien à usage unique', async () => {
      const { email } = await register();
      await request(server).post('/api/auth/forgot-password').send({ email: email.toUpperCase() }).expect(200);
      const asked = await prisma.user.findUnique({ where: { email } });
      expect(asked!.passwordResetTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(asked!.passwordResetExpiresAt!.getTime()).toBeGreaterThan(Date.now());

      // le jeton réel n’est connu que par e-mail : on pose une empreinte connue pour tester la suite
      await prisma.user.update({ where: { email }, data: { passwordResetTokenHash: hashToken(`jeton-e2e-reset-${RUN}`) } });

      await request(server).post('/api/auth/reset-password').send({ token: `jeton-e2e-reset-${RUN}`, newPassword: 'faible' }).expect(400);
      await request(server).post('/api/auth/reset-password').send({ token: `jeton-e2e-reset-${RUN}`, newPassword: 'Nouveau1234' }).expect(200);

      await request(server).post('/api/auth/login').send({ identifier: email, password: PASSWORD }).expect(401);
      await request(server).post('/api/auth/login').send({ identifier: email, password: 'Nouveau1234' }).expect(200);
      await request(server).post('/api/auth/reset-password').send({ token: `jeton-e2e-reset-${RUN}`, newPassword: 'Autre12345' }).expect(400);

      const after = await prisma.user.findUnique({ where: { email } });
      expect(after!.verificationStatus).toBe('VERIFIE');
      expect(after!.passwordResetTokenHash).toBeNull();
    });

    it('refuse un jeton expiré', async () => {
      const { email } = await register();
      await prisma.user.update({
        where: { email },
        data: { passwordResetTokenHash: hashToken(`jeton-e2e-expire-${RUN}`), passwordResetExpiresAt: new Date(Date.now() - 1000) },
      });
      await request(server).post('/api/auth/reset-password').send({ token: `jeton-e2e-expire-${RUN}`, newPassword: 'Nouveau1234' }).expect(400);
    });
  });

  it('verrouille le compte après 5 mots de passe erronés, même avec le bon ensuite', async () => {
    const { email } = await register();
    for (let i = 0; i < 5; i++) {
      await request(server).post('/api/auth/login').send({ identifier: email, password: 'Mauvais123' }).expect(401);
    }
    const locked = await request(server).post('/api/auth/login').send({ identifier: email, password: PASSWORD });
    expect(locked.status).toBe(429);
    expect(locked.body.message).toMatch(/verrouillé/);

    // le verrouillage expire
    await prisma.user.update({ where: { email }, data: { loginLockedUntil: new Date(Date.now() - 1000) } });
    await request(server).post('/api/auth/login').send({ identifier: email, password: PASSWORD }).expect(200);
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.loginAttempts).toBe(0);
  });
});
