import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { computeCommission } from '../src/common/commission';


// Aucun e-mail réel pendant les tests (le lien est simplement journalisé) et pas de limitation par IP.
process.env.SMTP_HOST = '';
process.env.RATE_LIMIT_DISABLED = 'true';
// Retraits : pas de délai de séjour pendant les tests, et retraits simulés.
process.env.WALLET_HOLD_HOURS = '0';
process.env.PAYOUT_MODE = 'simulation';

type Role = 'CLIENT' | 'COMMERCANT' | 'LIVREUR' | 'ADMINISTRATEUR';
type Actor = { agent: ReturnType<typeof request.agent>; id: number; phone: string; lastInitial: string; addressId?: number };

const PASSWORD = 'Test1234';
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE ?? 2000);
const PRICE = 5000;
const stamp = Date.now();
const rand = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
const okStatus = (status: number) => expect([200, 201]).toContain(status);

describe('Parcours complet Bam\'S Market (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;

  let admin: Actor, merchant: Actor, merchant2: Actor, client: Actor, client2: Actor, livreur: Actor;
  const ctx: { categoryId?: number; shopId?: number; productId?: number } = {};

  async function createUser(role: Role, label: string): Promise<Actor> {
    const phone = `034${rand(7)}`;
    const reg = await request(server)
      .post('/api/auth/register')
      .send({ firstName: 'E2E', lastName: label, phone, email: `e2e.${stamp}${rand(4)}@example.mg`, password: PASSWORD })
     // .send({ firstName: 'E2E', lastName: label, phone, password: PASSWORD });
    expect(reg.status).toBe(201);

    // L'inscription publique crée toujours un CLIENT : on promeut en base avant la connexion.
    const user = await prisma.user.update({
      where: { phone },
      data: { role, verificationStatus: 'VERIFIE' },
    });

    const agent = request.agent(server);
    const login = await agent.post('/api/auth/login').send({ identifier: phone, password: PASSWORD });
    expect(login.status).toBe(200);
    return { agent, id: user.id, phone, lastInitial: label.charAt(0) };
  }

  async function addAddress(actor: Actor) {
    const res = await actor.agent
      .post('/api/addresses')
      .send({ label: 'Maison', fullAddress: 'Lot II B 18, Isaha, Fianarantsoa', phone: actor.phone });
    okStatus(res.status);
    actor.addressId = res.body.id;
  }

  async function placeOrder(actor: Actor, quantity = 1) {
    const add = await actor.agent.post('/api/cart/items').send({ productId: ctx.productId, quantity });
    okStatus(add.status);
    const res = await actor.agent.post('/api/orders').send({ addressId: actor.addressId });
    expect(res.status).toBe(201);
    return res.body;
  }

  async function pay(actor: Actor, orderId: number, outcome: 'SUCCESS' | 'FAILURE' = 'SUCCESS') {
    const init = await actor.agent.post('/api/payments').send({ orderId });
    okStatus(init.status);
    const cb = await actor.agent.post(`/api/payments/${init.body.id}/simulate`).send({ outcome });
    okStatus(cb.status);
    return { payment: init.body, result: cb.body };
  }

  async function getOrder(actor: Actor, orderId: number) {
    const res = await actor.agent.get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    return res.body;
  }

  async function findDelivery(orderId: number) {
    const res = await livreur.agent.get('/api/deliveries/available');
    expect(res.status).toBe(200);
    return res.body.find((d: any) => d.orderId === orderId);
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

    admin = await createUser('ADMINISTRATEUR', 'Admin');
    merchant = await createUser('COMMERCANT', 'Marchand');
    merchant2 = await createUser('COMMERCANT', 'Marchand2');
    client = await createUser('CLIENT', 'Client');
    client2 = await createUser('CLIENT', 'Client2');
    livreur = await createUser('LIVREUR', 'Livreur');
    await addAddress(client);
    await addAddress(client2);
  });

  afterAll(async () => {
    await app.close();
  });

  // ───────────────────────── Santé & authentification ─────────────────────────
  describe('Authentification et permissions', () => {
    it('GET /api/db-test répond 200', async () => {
      await request(server).get('/api/db-test').expect(200);
    });

    it('refuse un mot de passe trop faible', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ firstName: 'A', lastName: 'B', phone: `034${rand(7)}`, password: 'abc' });
      expect(res.status).toBe(400);
    });

    it('refuse un doublon de téléphone', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ firstName: 'E2E', lastName: 'Doublon', phone: client.phone, password: PASSWORD });
      expect([400, 409]).toContain(res.status);
    });

    it('refuse un mauvais mot de passe', async () => {
      const res = await request(server).post('/api/auth/login').send({ identifier: client.phone, password: 'Mauvais123' });
      expect(res.status).toBe(401);
    });

    it('/auth/me : 401 sans cookie, 200 avec cookie', async () => {
      await request(server).get('/api/auth/me').expect(401);
      await client.agent.get('/api/auth/me').expect(200);
    });

    it('routes protégées sans session : 401', async () => {
      await request(server).get('/api/orders').expect(401);
    });

    it('un CLIENT ne peut ni administrer, ni créer une boutique, ni créer un produit', async () => {
      await client.agent.get('/api/admin/dashboard').expect(403);
      await client.agent.post('/api/shops').field('name', 'X').expect(403);
      await client.agent.post('/api/products').field('name', 'X').expect(403);
    });

    it('seul un LIVREUR accède aux missions', async () => {
      await client.agent.get('/api/deliveries/available').expect(403);
      await livreur.agent.get('/api/deliveries/available').expect(200);
    });
  });

  // ───────────────────────── Catalogue : catégorie, boutique, produit ─────────────────────────
  describe('Catalogue (admin → commerçant)', () => {
    it('l’admin crée une catégorie', async () => {
      const res = await admin.agent.post('/api/categories').send({ name: `Alimentation E2E ${stamp}` });
      okStatus(res.status);
      ctx.categoryId = res.body.id;
    });

    it('le commerçant crée sa boutique (EN_ATTENTE_VALIDATION) mais ne peut pas encore publier (BR-PRD-01)', async () => {
      const res = await merchant.agent
        .post('/api/shops')
        .field('name', `Boutique E2E ${stamp}`)
        .field('description', 'Boutique de test automatisé')
        .field('address', 'Lot II B 45, Fianarantsoa')
        .field('contactPhone', '0341234567');
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('EN_ATTENTE_VALIDATION');
      ctx.shopId = res.body.id;

      const product = await merchant.agent
        .post('/api/products')
        .field('name', 'Riz local 1kg')
        .field('description', 'Riz de Fianarantsoa')
        .field('price', String(PRICE))
        .field('stock', '50')
        .field('categoryId', String(ctx.categoryId));
      expect(product.status).toBe(403);
    });

    it('refuse une 2e boutique pour le même commerçant (BR-BQT-02)', async () => {
      const res = await merchant.agent
        .post('/api/shops')
        .field('name', 'Doublon')
        .field('description', 'Deuxième boutique interdite')
        .field('address', 'Fianarantsoa centre')
        .field('contactPhone', '0341234567');
      expect(res.status).toBe(409);
    });

    it('l’admin valide la boutique, le commerçant publie un produit visible au catalogue', async () => {
      const validate = await admin.agent.patch(`/api/shops/${ctx.shopId}/status`).send({ status: 'VALIDEE' });
      expect(validate.status).toBe(200);

      const product = await merchant.agent
        .post('/api/products')
        .field('name', 'Riz local 1kg')
        .field('description', 'Riz de Fianarantsoa')
        .field('price', String(PRICE))
        .field('stock', '50')
        .field('categoryId', String(ctx.categoryId));
      expect(product.status).toBe(201);
      ctx.productId = product.body.id;

      const catalogue = await request(server).get('/api/products');
      expect(catalogue.status).toBe(200);
      expect(JSON.stringify(catalogue.body)).toContain('Riz local 1kg');
    });
  });

  // ───────────────────────── Parcours nominal ─────────────────────────
  describe('Parcours nominal : commande → paiement → préparation → livraison', () => {
    let order: any;
    let deliveryId: number;

    it('panier vide : la commande est refusée', async () => {
      const res = await client2.agent.post('/api/orders').send({ addressId: client2.addressId });
      expect(res.status).toBe(400);
    });

    it('le client commande 2 articles : sous-total, frais, total, code à 6 chiffres', async () => {
      order = await placeOrder(client, 2);
      expect(order.status).toBe('EN_ATTENTE_PAIEMENT');
      expect(order.subtotal).toBe(PRICE * 2);
      expect(order.total).toBe(PRICE * 2 + DELIVERY_FEE);

      const detail = await getOrder(client, order.id);
      expect(detail.confirmationCode).toMatch(/^\d{6}$/);
    });

    it('BR-PAY-04 : la commission est calculée sur le sous-total et figée sur la commande', async () => {
      const expected = computeCommission(PRICE * 2);
      const stored = await prisma.order.findUnique({ where: { id: order.id } });
      expect(stored!.commissionPercent).toBe(expected.commissionPercent);
      expect(stored!.commissionAmount).toBe(expected.commissionAmount);
      expect(stored!.merchantAmount).toBe(expected.merchantAmount);
      // sous-total = part du commerçant + commission ; les frais de livraison n'entrent pas dans la commission
      expect(stored!.commissionAmount + stored!.merchantAmount).toBe(stored!.subtotal);

      // le client ne voit jamais la répartition de la plateforme
      const detail = await getOrder(client, order.id);
      for (const body of [order, detail]) {
        expect(body).not.toHaveProperty('commissionAmount');
        expect(body).not.toHaveProperty('merchantAmount');
        expect(body).not.toHaveProperty('commissionPercent');
      }
    });

    it('US-012 : la commande non payée est invisible côté commerçant', async () => {
      const list = await merchant.agent.get('/api/orders/merchant/all');
      expect(list.status).toBe(200);
      expect(list.body.map((o: any) => o.id)).not.toContain(order.id);
      await merchant.agent.get(`/api/orders/merchant/${order.id}`).expect(404);
    });

    it('isolation : un autre client ne peut ni lire ni payer cette commande (BR-SEC-03)', async () => {
      await client2.agent.get(`/api/orders/${order.id}`).expect(403);
      const res = await client2.agent.post('/api/payments').send({ orderId: order.id });
      expect(res.status).toBe(403);
    });

    it('paiement : répartition reprise de la commande, idempotence à l’initiation et au callback', async () => {
      const share = computeCommission(PRICE * 2);
      const first = await client.agent.post('/api/payments').send({ orderId: order.id });
      okStatus(first.status);
      expect(first.body.status).toBe('EN_ATTENTE');
      expect(first.body.amount).toBe(order.total);
      expect(first.body.commissionAmount).toBe(share.commissionAmount); // sur le sous-total, pas sur le total
      expect(first.body.merchantAmount).toBe(share.merchantAmount);

      const second = await client.agent.post('/api/payments').send({ orderId: order.id });
      expect(second.body.id).toBe(first.body.id); // BR-PAY-05

      const ok = await client.agent.post(`/api/payments/${first.body.id}/simulate`).send({ outcome: 'SUCCESS' });
      okStatus(ok.status);
      expect(ok.body.status).toBe('VALIDEE');

      const again = await client.agent.post(`/api/payments/${first.body.id}/simulate`).send({ outcome: 'FAILURE' });
      expect(again.body.status).toBe('VALIDEE'); // BR-PAY-02 : pas de retraitement

      expect((await getOrder(client, order.id)).status).toBe('PAYEE');
    });

    it('la commande payée ne peut plus être annulée (BR-CMD-03)', async () => {
      await client.agent.patch(`/api/orders/${order.id}/cancel`).expect(400);
    });

    it('le commerçant voit la commande (lignes de sa boutique) et la passe en préparation', async () => {
      const list = await merchant.agent.get('/api/orders/merchant/all');
      expect(list.body.map((o: any) => o.id)).toContain(order.id);

      const detail = await merchant.agent.get(`/api/orders/merchant/${order.id}`);
      expect(detail.status).toBe(200);
      expect(detail.body.statusHistory.length).toBeGreaterThan(0);

      // BR-SEC-06 : aucune coordonnée directe du client n'est transmise au commerçant.
      for (const body of [JSON.stringify(list.body), JSON.stringify(detail.body)]) {
        expect(body).not.toContain(client.phone);
        expect(body).not.toContain('Isaha');
        expect(body).not.toContain('fullAddress');
        expect(body).not.toContain('confirmationCode');
      }
      expect(detail.body.address).toEqual({ id: expect.any(Number), label: 'Maison', city: 'Fianarantsoa' });
      expect(detail.body.user).toEqual({ firstName: 'E2E', lastName: client.lastInitial });

      // un autre commerçant (sans cette commande) ne la voit pas
      const other = await merchant2.agent.post('/api/shops')
        .field('name', `Boutique2 E2E ${stamp}`)
        .field('description', 'Deuxième boutique de test')
        .field('address', 'Fianarantsoa centre')
        .field('contactPhone', '0341234568');
      expect(other.status).toBe(201);
      const otherList = await merchant2.agent.get('/api/orders/merchant/all');
      expect(otherList.body.map((o: any) => o.id)).not.toContain(order.id);
      await merchant2.agent.get(`/api/orders/merchant/${order.id}`).expect(404);

      const prep = await merchant.agent.patch(`/api/orders/${order.id}/prepare`);
      okStatus(prep.status);
      expect(prep.body.status).toBe('EN_PREPARATION');

      await merchant.agent.patch(`/api/orders/${order.id}/prepare`).expect(400); // déjà en préparation
    });

    it('le livreur voit la mission sans jamais voir le code de confirmation (BR-LIV-04)', async () => {
      const res = await livreur.agent.get('/api/deliveries/available');
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('confirmationCode');
      const delivery = res.body.find((d: any) => d.orderId === order.id);
      expect(delivery).toBeDefined();

      // BR-SEC-06 : avant acceptation, ni téléphone ni adresse exacte, seulement la zone.
      const available = JSON.stringify(res.body);
      expect(available).not.toContain(client.phone);
      expect(available).not.toContain('Isaha');
      expect(available).not.toContain('fullAddress');
      expect(delivery.order.address).toEqual({ label: 'Maison', city: 'Fianarantsoa' });
      expect(delivery.order.user).toEqual({ firstName: 'E2E' });
      expect(delivery.order.items[0].product.shop.name).toBeDefined();
      deliveryId = delivery.id;
    });

    it('le livreur accepte, puis un mauvais code est refusé, le bon code clôt la livraison', async () => {
      const accept = await livreur.agent.patch(`/api/deliveries/${deliveryId}/accept`);
      okStatus(accept.status);
      expect(accept.body.status).toBe('EN_COURS');

      // Après acceptation, le livreur reçoit les coordonnées nécessaires à la livraison.
      const mine = await livreur.agent.get('/api/deliveries/mine');
      expect(mine.status).toBe(200);
      const active = mine.body.find((d: any) => d.id === deliveryId);
      expect(active.order.address.fullAddress).toContain('Isaha');
      expect(active.order.user.phone).toBe(client.phone);
      expect(JSON.stringify(mine.body)).not.toContain('confirmationCode');
      expect((await getOrder(client, order.id)).status).toBe('EN_COURS_DE_LIVRAISON');

      const bad = await livreur.agent.patch(`/api/deliveries/${deliveryId}/confirm`).send({ confirmationCode: '000000' });
      expect(bad.status).toBe(400);

      const code = (await getOrder(client, order.id)).confirmationCode;
      const good = await livreur.agent.patch(`/api/deliveries/${deliveryId}/confirm`).send({ confirmationCode: code });
      okStatus(good.status);
      expect(good.body.status).toBe('LIVREE');
      expect((await getOrder(client, order.id)).status).toBe('LIVREE');

      const again = await livreur.agent.patch(`/api/deliveries/${deliveryId}/confirm`).send({ confirmationCode: code });
      expect(again.status).toBe(400); // BR-LIV-05
    });

    it('l’historique du livreur contient la livraison', async () => {
      const res = await livreur.agent.get('/api/deliveries/history');
      expect(res.body.map((d: any) => d.id)).toContain(deliveryId);
    });

    it('BR-PAY-04 : la livraison confirmée crédite le commerçant et le livreur, une seule fois', async () => {
      const share = computeCommission(PRICE * 2);

      const m = await merchant.agent.get('/api/wallet/me');
      expect(m.status).toBe(200);
      expect(m.body.balance).toBe(share.merchantAmount);
      expect(m.body.entries).toEqual([
        expect.objectContaining({ type: 'VENTE', amount: share.merchantAmount, orderId: order.id }),
      ]);

      const l = await livreur.agent.get('/api/wallet/me');
      expect(l.status).toBe(200);
      expect(l.body.balance).toBe(DELIVERY_FEE);
      expect(l.body.entries).toEqual([
        expect.objectContaining({ type: 'LIVRAISON', amount: DELIVERY_FEE, orderId: order.id }),
      ]);

      // le client n'a rien à retirer ; la route exige une session
      const c = await client.agent.get('/api/wallet/me');
      expect(c.status).toBe(200);
      expect(c.body.balance).toBe(0);
      await request(server).get('/api/wallet/me').expect(401);

      // la confirmation rejouée (testée plus haut : 400) n'a rien crédité de plus
      expect((await merchant.agent.get('/api/wallet/me')).body.balance).toBe(share.merchantAmount);
    });

    it('admin : détail sans confirmationCode, paiement et livreur visibles, audit trail présent (BR-SEC-01)', async () => {
      const res = await admin.agent.get(`/api/admin/orders/${order.id}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('confirmationCode');
      expect(res.body.payment.status).toBe('VALIDEE');
      expect(res.body.delivery.livreur).toBeDefined();

      const logs = await admin.agent.get('/api/admin/audit-logs');
      expect(logs.status).toBe(200);
      const text = JSON.stringify(logs.body);
      expect(text).toContain('ORDER_STATUS_CHANGE');
      expect(text).toContain('PAYMENT_STATUS_CHANGE');
      expect(text).toContain('SHOP_STATUS_CHANGE');
    });
  });

  // ───────────────────────── Parcours alternatifs ─────────────────────────
  describe('Parcours alternatifs', () => {
    it('paiement échoué : paiement et commande passent à ECHOUEE', async () => {
      const order = await placeOrder(client);
      const { result } = await pay(client, order.id, 'FAILURE');
      expect(result.status).toBe('ECHOUEE');
      expect((await getOrder(client, order.id)).status).toBe('ECHOUEE');
      const retry = await client.agent.post('/api/payments').send({ orderId: order.id });
      expect(retry.status).toBe(400);
    });

    it('annulation avant paiement : ANNULEE, puis paiement impossible', async () => {
      const order = await placeOrder(client);
      const cancel = await client.agent.patch(`/api/orders/${order.id}/cancel`);
      okStatus(cancel.status);
      expect(cancel.body.status).toBe('ANNULEE');
      const res = await client.agent.post('/api/payments').send({ orderId: order.id });
      expect(res.status).toBe(400);
    });

    it('livraison échouée → mission ECHEC, commande ECHOUEE (historique), aucun crédit', async () => {
      const order = await placeOrder(client);
      await pay(client, order.id);
      okStatus((await merchant.agent.patch(`/api/orders/${order.id}/prepare`)).status);
      const delivery = await findDelivery(order.id);
      okStatus((await livreur.agent.patch(`/api/deliveries/${delivery.id}/accept`)).status);

      const fail = await livreur.agent.patch(`/api/deliveries/${delivery.id}/fail`);
      okStatus(fail.status);
      expect(fail.body.status).toBe('ECHEC');
      const failed = await getOrder(client, order.id);
      expect(failed.status).toBe('ECHOUEE');
      expect(failed.statusHistory.map((h: any) => h.status)).toContain('ECHOUEE');

      // la mission close ne peut plus être déclarée en échec une seconde fois
      expect((await livreur.agent.patch(`/api/deliveries/${delivery.id}/fail`)).status).toBe(400);

      const history = await livreur.agent.get('/api/deliveries/history');
      expect(history.body.map((d: any) => d.id)).toContain(delivery.id);

      // pas de livraison réussie : ni le livreur ni le commerçant ne reçoivent de crédit supplémentaire
      expect((await livreur.agent.get('/api/wallet/me')).body.balance).toBe(DELIVERY_FEE);
      expect((await merchant.agent.get('/api/wallet/me')).body.balance).toBe(computeCommission(PRICE * 2).merchantAmount);
    });
  });

  // ───────────────────────── Retraits (portefeuille → Mobile Money, simulés) ─────────────────────────
  describe('Retraits du portefeuille (simulation)', () => {
    // Numéros uniques à chaque exécution : la base de test garde les données des exécutions précédentes
    // et un numéro de retrait n'appartient qu'à un seul compte.
    const MERCHANT_PAYOUT = `034${rand(7)}`;
    const LIVREUR_PAYOUT = `033${rand(7)}`;
    const credited = () => computeCommission(PRICE * 2).merchantAmount; // part du commerçant, livrée plus haut
    const setPhone = (userId: number, phone: string, reason = 'Numéro vérifié avec le titulaire') =>
      admin.agent.patch(`/api/admin/payouts/users/${userId}/phone`).send({ phone, reason });

    it('un CLIENT ne peut pas utiliser les retraits ; sans session : 401', async () => {
      await client.agent.get('/api/payouts/settings').expect(403);
      await client.agent.post('/api/payouts').send({ amount: 5000, password: PASSWORD }).expect(403);
      await request(server).get('/api/payouts/settings').expect(401);
    });

    it('il n’existe plus de PIN ni de changement de numéro par l’utilisateur', async () => {
      await merchant.agent.put('/api/payouts/pin').send({ pin: '1234' }).expect(404);
      await merchant.agent.put('/api/payouts/phone').send({ phone: MERCHANT_PAYOUT, pin: '1234' }).expect(404);
    });

    it('sans numéro de retrait enregistré, le retrait est refusé', async () => {
      const res = await merchant.agent.post('/api/payouts').send({ amount: 5000, password: PASSWORD });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('numéro de retrait');
    });

    it('seul un administrateur change le numéro de retrait, avec un motif', async () => {
      await merchant.agent.patch(`/api/admin/payouts/users/${merchant.id}/phone`).send({ phone: MERCHANT_PAYOUT, reason: 'Je veux changer' }).expect(403);
      expect((await setPhone(merchant.id, '0123')).status).toBe(400);
      expect((await admin.agent.patch(`/api/admin/payouts/users/${merchant.id}/phone`).send({ phone: MERCHANT_PAYOUT })).status).toBe(400); // motif manquant
      expect((await setPhone(client.id, MERCHANT_PAYOUT)).status).toBe(400); // un client n'a pas de numéro de retrait

      const ok = await setPhone(merchant.id, `+261 ${MERCHANT_PAYOUT.slice(1)}`);
      okStatus(ok.status);
      expect(ok.body.payoutPhone).toBe(MERCHANT_PAYOUT);

      // un numéro appartient à un seul compte
      expect((await setPhone(livreur.id, MERCHANT_PAYOUT)).status).toBe(409);
    });

    it('les réglages exposent le numéro et les plafonds, jamais de secret', async () => {
      const settings = await merchant.agent.get('/api/payouts/settings');
      expect(settings.status).toBe(200);
      expect(settings.body).toMatchObject({
        mode: 'simulation', payoutPhone: MERCHANT_PAYOUT, authLockedUntil: null, dailyMaxAmount: 1000000, dailyRemaining: 1000000,
      });
      expect(JSON.stringify(settings.body)).not.toContain('assword');
      expect(JSON.stringify(settings.body)).not.toContain('Hash');
    });

    it('aperçu : frais à la charge du bénéficiaire, numéro de réception, solde retirable = part livrée', async () => {
      const res = await merchant.agent.post('/api/payouts/preview').send({ amount: 5000 });
      okStatus(res.status);
      expect(res.body).toEqual({ amount: 5000, fees: 100, totalDebited: 5100, phone: MERCHANT_PAYOUT, available: credited() });
    });

    it('mot de passe manquant ou faux, montant trop petit : refusés (400), rien n’est débité', async () => {
      expect((await merchant.agent.post('/api/payouts').send({ amount: 5000 })).status).toBe(400);
      const wrong = await merchant.agent.post('/api/payouts').send({ amount: 5000, password: 'Mauvais123' });
      expect(wrong.status).toBe(400); // 400 et non 401 : la session reste ouverte
      expect(wrong.body.message).toContain('Mot de passe incorrect');
      expect((await merchant.agent.post('/api/payouts').send({ amount: 500, password: PASSWORD })).status).toBe(400);
      expect((await merchant.agent.get('/api/wallet/me')).body.balance).toBe(credited());
      await merchant.agent.get('/api/auth/me').expect(200);
    });

    it('retrait réussi : montant + frais débités du solde, retrait REUSSI dans l’historique', async () => {
      const res = await merchant.agent.post('/api/payouts').send({ amount: 5000, password: PASSWORD });
      okStatus(res.status);
      expect(res.body).toMatchObject({ amount: 5000, fees: 100, totalDebited: 5100, status: 'REUSSI', phone: MERCHANT_PAYOUT });

      const wallet = await merchant.agent.get('/api/wallet/me');
      expect(wallet.body.balance).toBe(credited() - 5100);
      expect(wallet.body.available).toBe(credited() - 5100);
      expect(wallet.body.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'RETRAIT', amount: -5100, payoutId: res.body.id }),
      ]));

      const list = await merchant.agent.get('/api/payouts');
      expect(list.body.map((p: any) => p.id)).toContain(res.body.id);

      const settings = await merchant.agent.get('/api/payouts/settings');
      expect(settings.body.dailyRemaining).toBe(1000000 - 5000);
    });

    it('plafond journalier : un retrait qui le dépasserait est refusé, rien n’est débité', async () => {
      const before = (await merchant.agent.get('/api/wallet/me')).body.balance;
      const previous = process.env.PAYOUT_DAILY_MAX_AMOUNT;
      process.env.PAYOUT_DAILY_MAX_AMOUNT = '6000'; // 5 000 déjà retirés aujourd'hui : il reste 1 000
      try {
        const res = await merchant.agent.post('/api/payouts').send({ amount: 2000, password: PASSWORD });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Plafond');
        expect((await merchant.agent.get('/api/payouts/settings')).body.dailyRemaining).toBe(1000);
      } finally {
        if (previous === undefined) delete process.env.PAYOUT_DAILY_MAX_AMOUNT;
        else process.env.PAYOUT_DAILY_MAX_AMOUNT = previous;
      }
      expect((await merchant.agent.get('/api/wallet/me')).body.balance).toBe(before);
    });

    it('un retrait supérieur au solde retirable est refusé', async () => {
      const left = (await merchant.agent.get('/api/wallet/me')).body.available;
      const res = await merchant.agent.post('/api/payouts').send({ amount: left, password: PASSWORD }); // + frais > solde
      expect(res.status).toBe(400);
      expect((await merchant.agent.get('/api/wallet/me')).body.balance).toBe(left);
    });

    it('l’administrateur voit les retraits ; un client non ; le journal d’audit garde la trace', async () => {
      const res = await admin.agent.get('/api/admin/payouts');
      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({ amount: 5000, status: 'REUSSI' });
      expect(res.body[0].user).toMatchObject({ id: merchant.id, role: 'COMMERCANT' });
      expect(JSON.stringify(res.body)).not.toContain('Hash');
      await client.agent.get('/api/admin/payouts').expect(403);

      const logs = JSON.stringify((await admin.agent.get('/api/admin/audit-logs')).body);
      expect(logs).toContain('PAYOUT_REQUESTED');
      expect(logs).toContain('PAYOUT_PHONE_CHANGED');
    });

    it('la confirmation se bloque (429) après 5 erreurs, même ensuite avec le bon mot de passe', async () => {
      okStatus((await setPhone(livreur.id, LIVREUR_PAYOUT)).status);

      for (let i = 0; i < 4; i++) {
        expect((await livreur.agent.post('/api/payouts').send({ amount: 1000, password: 'Mauvais123' })).status).toBe(400);
      }
      expect((await livreur.agent.post('/api/payouts').send({ amount: 1000, password: 'Mauvais123' })).status).toBe(429);
      expect((await livreur.agent.post('/api/payouts').send({ amount: 1000, password: PASSWORD })).status).toBe(429);
      expect((await livreur.agent.get('/api/wallet/me')).body.balance).toBe(DELIVERY_FEE);
      expect((await livreur.agent.get('/api/payouts/settings')).body.authLockedUntil).not.toBeNull();
    });
  });

  // ───────────────────────── Administration ─────────────────────────
  describe('Administration des comptes', () => {
    it('l’admin ne peut pas modifier son propre statut', async () => {
      const res = await admin.agent.patch(`/api/admin/users/${admin.id}/status`).send({ accountStatus: 'SUSPENDU' });
      expect(res.status).toBe(400);
    });

    it('un compte suspendu ne peut plus se connecter, puis peut être réactivé (BR-USR-05)', async () => {
      const suspend = await admin.agent.patch(`/api/admin/users/${client2.id}/status`).send({ accountStatus: 'SUSPENDU' });
      expect(suspend.status).toBe(200);

      const login = await request(server).post('/api/auth/login').send({ identifier: client2.phone, password: PASSWORD });
      expect(login.status).toBeGreaterThanOrEqual(400);
      expect(login.status).toBeLessThan(500);

      const reactivate = await admin.agent.patch(`/api/admin/users/${client2.id}/status`).send({ accountStatus: 'ACTIF' });
      expect(reactivate.status).toBe(200);
    });

    it('le dashboard admin répond avec des compteurs cohérents', async () => {
      const res = await admin.agent.get('/api/admin/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.users).toBeGreaterThanOrEqual(6);
      expect(res.body.validatedShops).toBeGreaterThanOrEqual(1);
      expect(res.body.paymentsVolume).toBeGreaterThanOrEqual(PRICE * 2 + DELIVERY_FEE);
    });
  });
});