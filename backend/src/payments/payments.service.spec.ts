import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { getPaymentMode } from './payment-mode';
import { makeAuditMock, makePrismaMock } from '../common/testing/mocks';

describe('PaymentsService', () => {
  let prisma: any, audit: any, service: PaymentsService;
  const future = () => new Date(Date.now() + 5 * 60 * 1000);
  const past = () => new Date(Date.now() - 1000);

  beforeEach(() => {
    prisma = makePrismaMock();
    audit = makeAuditMock();
    service = new PaymentsService(prisma, audit);
  });

  /** Prépare un règlement réussi (paiement réclamé, commande réclamée, une ligne à restituer). */
  const armSettlement = (finalPayment: any) => {
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.orderItem.findMany.mockResolvedValue([{ productId: 4, quantity: 2 }]);
    prisma.product.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findUnique.mockResolvedValueOnce(finalPayment);
  };

  describe('initiate', () => {
    it('404 / 403 / statut invalide', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.initiate(1, 1)).rejects.toThrow(NotFoundException);
      prisma.order.findUnique.mockResolvedValue({ id: 1, userId: 2, status: 'EN_ATTENTE_PAIEMENT' });
      await expect(service.initiate(1, 1)).rejects.toThrow(ForbiddenException);
      prisma.order.findUnique.mockResolvedValue({ id: 1, userId: 1, status: 'PAYEE' });
      await expect(service.initiate(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('est idempotent : réutilise un paiement en attente encore valide (BR-PAY-05)', async () => {
      const existing = { id: 3, status: 'EN_ATTENTE', expiresAt: future() };
      prisma.order.findUnique.mockResolvedValue({ id: 1, userId: 1, status: 'EN_ATTENTE_PAIEMENT', total: 10000, payment: existing });
      expect(await service.initiate(1, 1)).toBe(existing);
      expect(prisma.payment.upsert).not.toHaveBeenCalled();
    });

    it('reprend la répartition figée sur la commande, expiration ≈ 10 min (BR-PAY-03/04)', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 1, userId: 1, status: 'EN_ATTENTE_PAIEMENT', total: 12000, subtotal: 10000,
        commissionAmount: 1000, merchantAmount: 9000, payment: null,
      });
      prisma.payment.upsert.mockImplementation(async (a: any) => a.create);
      const res = await service.initiate(1, 1);
      expect(res.amount).toBe(12000); // le client paie sous-total + livraison
      expect(res.commissionAmount).toBe(1000); // commission sur le sous-total, pas sur le total
      expect(res.merchantAmount).toBe(9000);
      expect(res.status).toBe('EN_ATTENTE');
      expect(res.externalReference).toMatch(/^SIM-/);
      const minutes = (res.expiresAt.getTime() - Date.now()) / 60000;
      expect(minutes).toBeGreaterThan(9);
      expect(minutes).toBeLessThanOrEqual(10);
    });
  });

  describe('getStatus', () => {
    it('404 si aucun paiement', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, userId: 1, payment: null });
      await expect(service.getStatus(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('403 si ce n’est pas la commande du client', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 2, userId: 2, payment: { id: 1 } });
      await expect(service.getStatus(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('expire à la volée un paiement dépassé : commande échouée et stock restitué', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, userId: 1, payment: { id: 3, status: 'EN_ATTENTE', expiresAt: past() } });
      armSettlement({ id: 3, status: 'EXPIREE' });

      const res = await service.getStatus(1, 1);

      expect(res.status).toBe('EXPIREE');
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: 3, status: 'EN_ATTENTE' }, data: { status: 'EXPIREE' },
      });
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'EN_ATTENTE_PAIEMENT' }, data: { status: 'ECHOUEE' },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 4 }, data: { stock: { increment: 2 } },
      });
    });
  });

  describe('simulateCallback', () => {
    const pay = (over: any = {}) => ({ id: 3, orderId: 1, status: 'EN_ATTENTE', expiresAt: future(), order: { userId: 1 }, ...over });

    it('403 si le paiement appartient à un autre client', async () => {
      prisma.payment.findUnique.mockResolvedValue(pay({ order: { userId: 2 } }));
      await expect(service.simulateCallback(1, 3, 'SUCCESS')).rejects.toThrow(ForbiddenException);
    });

    it('idempotence : un paiement déjà traité n’est pas retraité (BR-PAY-02)', async () => {
      prisma.payment.findUnique.mockResolvedValue(pay({ status: 'VALIDEE' }));
      await service.simulateCallback(1, 3, 'FAILURE');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('SUCCESS → paiement VALIDEE, commande PAYEE, stock conservé, audit', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce(pay());
      armSettlement({ id: 3, status: 'VALIDEE' });

      const res = await service.simulateCallback(1, 3, 'SUCCESS');

      expect(res.status).toBe('VALIDEE');
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'EN_ATTENTE_PAIEMENT' }, data: { status: 'PAYEE' },
      });
      expect(prisma.product.update).not.toHaveBeenCalled(); // le stock réservé reste réservé
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_STATUS_CHANGE', newValue: 'VALIDEE' }));
    });

    it('FAILURE → paiement ECHOUEE, commande ECHOUEE, stock restitué', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce(pay());
      armSettlement({ id: 3, status: 'ECHOUEE' });

      await service.simulateCallback(1, 3, 'FAILURE');

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'EN_ATTENTE_PAIEMENT' }, data: { status: 'ECHOUEE' },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 4 }, data: { stock: { increment: 2 } },
      });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ newValue: 'ECHOUEE' }));
    });

    it('délai dépassé : ignore SUCCESS et expire (BR-PAY-03)', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce(pay({ expiresAt: past() }));
      armSettlement({ id: 3, status: 'EXPIREE' });

      const res = await service.simulateCallback(1, 3, 'SUCCESS');

      expect(res.status).toBe('EXPIREE');
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('déjà réglé entre-temps (double clic, expiration) : ni stock restitué ni audit en double', async () => {
      prisma.payment.findUnique
        .mockResolvedValueOnce(pay())
        .mockResolvedValueOnce({ id: 3, status: 'EXPIREE' });
      prisma.payment.updateMany.mockResolvedValue({ count: 0 });

      const res = await service.simulateCallback(1, 3, 'FAILURE');

      expect(res.status).toBe('EXPIREE');
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('SUCCESS alors que la commande n’est plus payable : refusé (409), rien n’est modifié', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce(pay());
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.order.updateMany.mockResolvedValue({ count: 0 }); // commande déjà clôturée

      await expect(service.simulateCallback(1, 3, 'SUCCESS')).rejects.toThrow(ConflictException);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe('expireOverdue (balayage périodique)', () => {
    it('expire les paiements dépassés et les commandes jamais payées, en restituant le stock', async () => {
      prisma.payment.findMany.mockResolvedValue([{ id: 3, orderId: 1 }]);
      prisma.order.findMany.mockResolvedValue([{ id: 9 }]);
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.order.updateMany.mockResolvedValue({ count: 1 });
      prisma.orderItem.findMany.mockResolvedValue([{ productId: 4, quantity: 2 }]);
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findUnique.mockResolvedValue({ id: 3, status: 'EXPIREE' });

      const res = await service.expireOverdue();

      expect(res).toEqual({ payments: 1, orders: 1 });
      expect(prisma.payment.findMany.mock.calls[0][0].where).toMatchObject({ status: 'EN_ATTENTE' });
      expect(prisma.order.findMany.mock.calls[0][0].where).toMatchObject({
        status: 'EN_ATTENTE_PAIEMENT', payment: { is: null },
      });
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 9, status: 'EN_ATTENTE_PAIEMENT', payment: { is: null } },
        data: { status: 'ECHOUEE' },
      });
      expect(prisma.product.update).toHaveBeenCalledTimes(2); // une restitution par commande expirée
    });

    it('ne compte pas ce qu’un autre traitement a déjà réglé', async () => {
      prisma.payment.findMany.mockResolvedValue([{ id: 3, orderId: 1 }]);
      prisma.order.findMany.mockResolvedValue([{ id: 9 }]);
      prisma.payment.updateMany.mockResolvedValue({ count: 0 });
      prisma.order.updateMany.mockResolvedValue({ count: 0 });
      prisma.payment.findUnique.mockResolvedValue({ id: 3, status: 'VALIDEE' });

      const res = await service.expireOverdue();

      expect(res).toEqual({ payments: 0, orders: 0 });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('ne fait rien quand il n’y a rien à expirer', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.order.findMany.mockResolvedValue([]);
      expect(await service.expireOverdue()).toEqual({ payments: 0, orders: 0 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // Sécurité : en mode réel, un client ne doit jamais pouvoir valider lui-même son paiement.
  describe('mode de paiement (PAYMENT_MODE)', () => {
    const original = process.env.PAYMENT_MODE;
    afterEach(() => {
      if (original === undefined) delete process.env.PAYMENT_MODE;
      else process.env.PAYMENT_MODE = original;
    });

    it('le mode par défaut est « simulation »', () => {
      delete process.env.PAYMENT_MODE;
      expect(getPaymentMode()).toBe('simulation');
    });

    it('simulateCallback est refusé (403) en mode goalpay, sans toucher à la base', async () => {
      process.env.PAYMENT_MODE = 'goalpay';
      await expect(service.simulateCallback(1, 3, 'SUCCESS')).rejects.toThrow(ForbiddenException);
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('initiate est refusé (503) en mode goalpay tant que GOALPAY_ACCESS_KEY n’est pas configurée', async () => {
      process.env.PAYMENT_MODE = 'goalpay';
      const key = process.env.GOALPAY_ACCESS_KEY;
      delete process.env.GOALPAY_ACCESS_KEY;
      try {
        await expect(service.initiate(1, 1)).rejects.toThrow(ServiceUnavailableException);
      } finally {
        if (key !== undefined) process.env.GOALPAY_ACCESS_KEY = key;
      }
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
      expect(prisma.payment.upsert).not.toHaveBeenCalled();
    });
  });
});
