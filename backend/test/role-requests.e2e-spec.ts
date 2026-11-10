import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/auth/tokens';

// Pas d'e-mail réel, pas de limitation par IP, retraits simulés (la liste blanche du fournisseur est alors un simple succès).
process.env.SMTP_HOST = '';
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.PAYOUT_MODE = 'simulation';

const PASSWORD = 'Test1234';
const rand = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

describe('Demandes de rôle (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;

  async function newUser(opts: { role?: string; verified?: boolean } = {}) {
    const email = `role.${Date.now()}${rand(4)}@exemple.mg`;
    const phone = `034${rand(7)}`;
    await request(server)
      .post('/api/auth/register')
      .send({ firstName: 'Role', lastName: 'Test', email, phone, password: PASSWORD })
      .expect(201);
    await prisma.user.update({
      where: { email },
      data: { role: (opts.role ?? 'CLIENT') as any, verificationStatus: opts.verified === false ? 'NON_VERIFIE' : 'VERIFIE' },
    });
    const agent = request.agent(server);
    await agent.post('/api/auth/login').send({ identifier: email, password: PASSWORD }).expect(200);
    return { agent, email };
  }

  const payoutPhone = () => `033${rand(7)}`;

  // Le vrai jeton n'existe que dans l'e-mail : on pose une empreinte connue pour simuler le clic sur le lien.
  async function injectActivationToken(requestId: number, token: string, expiresInMs = 60_000) {
    await prisma.roleRequest.update({
      where: { id: requestId },
      data: { activationTokenHash: hashToken(token), activationExpiresAt: new Date(Date.now() + expiresInMs) },
    });
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

  it('un client vérifié dépose une demande ; une seconde en attente est refusée', async () => {
    const { agent } = await newUser();
    const phone = payoutPhone();
    const first = await agent.post('/api/role-requests').send({ requestedRole: 'COMMERCANT', payoutPhone: phone, message: 'Boutique de fruits' });
    expect(first.status).toBe(201);
    expect(first.body.status).toBe('EN_ATTENTE');
    expect(first.body.payoutPhone).toBe(phone);
    await agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() }).expect(409);
    const mine = await agent.get('/api/role-requests/mine').expect(200);
    expect(mine.body).toHaveLength(1);
  });

  it('refuse un e-mail non vérifié (403), un rôle interdit et un numéro invalide (400)', async () => {
    const unverified = await newUser({ verified: false });
    const blocked = await unverified.agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() });
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toBe('Vérifiez votre adresse e-mail pour effectuer cette action.');

    const { agent } = await newUser();
    await agent.post('/api/role-requests').send({ requestedRole: 'ADMINISTRATEUR', payoutPhone: payoutPhone() }).expect(400);
    await agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: '12345' }).expect(400);
  });

  it('un commerçant ne peut pas redemander un rôle (403)', async () => {
    const { agent } = await newUser({ role: 'COMMERCANT' });
    await agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() }).expect(403);
  });

  it('le demandeur peut annuler sa demande, puis en redéposer une', async () => {
    const { agent } = await newUser();
    const created = await agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() }).expect(201);
    await agent.patch(`/api/role-requests/${created.body.id}/cancel`).expect(200);
    await agent.patch(`/api/role-requests/${created.body.id}/cancel`).expect(404);
    await agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() }).expect(201);
  });

  it('seul un administrateur peut lister et trancher (401 / 403 sinon)', async () => {
    await request(server).get('/api/admin/role-requests').expect(401);
    const { agent } = await newUser();
    await agent.get('/api/admin/role-requests').expect(403);
    await agent.patch('/api/admin/role-requests/1/approve').expect(403);
  });

  it('l’administrateur approuve : le rôle ne change qu’au clic sur le lien reçu par e-mail', async () => {
    const applicant = await newUser();
    const phone = payoutPhone();
    const created = await applicant.agent.post('/api/role-requests').send({ requestedRole: 'COMMERCANT', payoutPhone: phone }).expect(201);
    const admin = await newUser({ role: 'ADMINISTRATEUR' });

    const pending = await admin.agent.get('/api/admin/role-requests?status=EN_ATTENTE').expect(200);
    expect(pending.body.some((r: any) => r.id === created.body.id && r.user.email === applicant.email)).toBe(true);

    const res = await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/approve`).expect(200);
    expect(res.body.status).toBe('A_ACTIVER');

    // approuvée mais pas encore activée : le compte reste un client, sans numéro de retrait
    const before = await prisma.user.findUnique({ where: { email: applicant.email } });
    expect(before!.role).toBe('CLIENT');
    expect(before!.payoutPhone).toBeNull();

    // une décision rejouée ne change rien
    await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/approve`).expect(409);
    await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/reject`).send({ reason: 'Trop tard maintenant' }).expect(409);
    // pas de nouvelle demande tant que celle-ci est en cours
    await applicant.agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() }).expect(409);

    // clic sur le lien (sans être connecté) : le rôle et le numéro sont enregistrés
    await injectActivationToken(created.body.id, 'jeton-activation-e2e');
    const activated = await request(server).post('/api/role-requests/activate').send({ token: 'jeton-activation-e2e' }).expect(201);
    expect(activated.body).toEqual({ success: true, role: 'COMMERCANT' });
    const after = await prisma.user.findUnique({ where: { email: applicant.email } });
    expect(after!.role).toBe('COMMERCANT');
    expect(after!.payoutPhone).toBe(phone);

    // le lien est à usage unique
    await request(server).post('/api/role-requests/activate').send({ token: 'jeton-activation-e2e' }).expect(400);

    const me = await applicant.agent.get('/api/auth/me').expect(200);
    expect(me.body.role).toBe('COMMERCANT');
  });

  it('un lien d’activation expiré ou inconnu est refusé (400) ; le renvoi donne un nouveau lien', async () => {
    const applicant = await newUser();
    const created = await applicant.agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() }).expect(201);
    const admin = await newUser({ role: 'ADMINISTRATEUR' });
    await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/approve`).expect(200);

    await request(server).post('/api/role-requests/activate').send({ token: 'jeton-totalement-inconnu' }).expect(400);
    await request(server).post('/api/role-requests/activate').send({ token: 'court' }).expect(400);

    await injectActivationToken(created.body.id, 'jeton-expire-e2e', -1000);
    await request(server).post('/api/role-requests/activate').send({ token: 'jeton-expire-e2e' }).expect(400);

    await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/resend-activation`).expect(200);
    const row = await prisma.roleRequest.findUnique({ where: { id: created.body.id } });
    expect(row!.activationTokenHash).not.toBe(hashToken('jeton-expire-e2e'));
    expect(row!.activationExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    const user = await prisma.user.findUnique({ where: { email: applicant.email } });
    expect(user!.role).toBe('CLIENT');
  });

  it('le demandeur peut annuler une demande approuvée mais non activée', async () => {
    const applicant = await newUser();
    const created = await applicant.agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() }).expect(201);
    const admin = await newUser({ role: 'ADMINISTRATEUR' });
    await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/approve`).expect(200);
    await injectActivationToken(created.body.id, 'jeton-annule-e2e');
    await applicant.agent.patch(`/api/role-requests/${created.body.id}/cancel`).expect(200);
    await request(server).post('/api/role-requests/activate').send({ token: 'jeton-annule-e2e' }).expect(400);
  });

  it('l’administrateur refuse avec un motif obligatoire ; le rôle ne change pas', async () => {
    const applicant = await newUser();
    const created = await applicant.agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() }).expect(201);
    const admin = await newUser({ role: 'ADMINISTRATEUR' });

    await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/reject`).send({}).expect(400);
    await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/reject`).send({ reason: 'abc' }).expect(400);
    const res = await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/reject`).send({ reason: 'Pièces manquantes' }).expect(200);
    expect(res.body.status).toBe('REFUSEE');
    expect(res.body.rejectionReason).toBe('Pièces manquantes');

    const user = await prisma.user.findUnique({ where: { email: applicant.email } });
    expect(user!.role).toBe('CLIENT');
    // après un refus, une nouvelle demande est possible
    await applicant.agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: payoutPhone() }).expect(201);
  });

  it('un numéro de retrait déjà attribué à un autre compte est refusé (409)', async () => {
    const first = await newUser();
    const phone = payoutPhone();
    const created = await first.agent.post('/api/role-requests').send({ requestedRole: 'LIVREUR', payoutPhone: phone }).expect(201);
    const admin = await newUser({ role: 'ADMINISTRATEUR' });
    await admin.agent.patch(`/api/admin/role-requests/${created.body.id}/approve`).expect(200);
    await injectActivationToken(created.body.id, 'jeton-numero-e2e');
    await request(server).post('/api/role-requests/activate').send({ token: 'jeton-numero-e2e' }).expect(201);

    const second = await newUser();
    await second.agent.post('/api/role-requests').send({ requestedRole: 'COMMERCANT', payoutPhone: phone }).expect(409);
  });
});
