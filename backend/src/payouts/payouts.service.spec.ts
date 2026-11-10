import { BadRequestException, ConflictException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PayoutsService } from './payouts.service';
import { SimulatedPayoutProvider } from './simulated-payout.provider';
import { makeAuditMock, makePrismaMock } from '../common/testing/mocks';

describe('PayoutsService', () => {
  let prisma: any, audit: any, provider: any, mail: any, service: PayoutsService;
  const PASSWORD = 'Secret1234';
  const future = () => new Date(Date.now() + 3_600_000);

  const user = (over: any = {}) => ({
    id: 5, role: 'COMMERCANT', firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.mg',
    passwordHash: bcrypt.hashSync(PASSWORD, 4),
    payoutPhone: '0341234567', payoutAuthAttempts: 0, payoutAuthLockedUntil: null,
    ...over,
  });

  beforeEach(() => {
    prisma = makePrismaMock();
    audit = makeAuditMock();
    provider = {
      ensureWhitelisted: jest.fn().mockResolvedValue(undefined),
      preview: jest.fn().mockResolvedValue({ fees: 100 }),
      withdraw: jest.fn().mockResolvedValue({ status: 'success', providerReference: 'OP-1' }),
    };
    mail = {
      sendPayoutEmail: jest.fn().mockResolvedValue(true),
      sendPayoutPhoneChangedEmail: jest.fn().mockResolvedValue(true),
    };
    service = new PayoutsService(prisma, audit, provider, mail);
    prisma.user.findUnique.mockResolvedValue(user());
    prisma.user.update.mockResolvedValue({ payoutAuthAttempts: 1 });
    prisma.payout.aggregate.mockResolvedValue({ _sum: { amount: 0 }, _count: { _all: 0 } });
  });

  describe('accès', () => {
    it('refuse un CLIENT (403) partout', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ role: 'CLIENT' }));
      await expect(service.getSettings(5)).rejects.toThrow(ForbiddenException);
      await expect(service.preview(5, 5000)).rejects.toThrow(ForbiddenException);
      await expect(service.create(5, 5000, PASSWORD)).rejects.toThrow(ForbiddenException);
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('les réglages n’exposent ni le hash du mot de passe ni l’e-mail', async () => {
      const res: any = await service.getSettings(5);
      expect(res).not.toHaveProperty('passwordHash');
      expect(res).not.toHaveProperty('email');
      expect(JSON.stringify(res)).not.toContain(user().passwordHash.slice(0, 20));
      expect(res).toMatchObject({ payoutPhone: '0341234567', authLockedUntil: null, dailyMaxAmount: 1000000, dailyRemaining: 1000000, dailyRemainingCount: 5 });
    });

    it('les réglages indiquent le blocage en cours et ce qu’il reste du plafond journalier', async () => {
      const until = future();
      prisma.user.findUnique.mockResolvedValue(user({ payoutAuthLockedUntil: until }));
      prisma.payout.aggregate.mockResolvedValue({ _sum: { amount: 300000 }, _count: { _all: 2 } });
      const res: any = await service.getSettings(5);
      expect(res.authLockedUntil).toEqual(until);
      expect(res.dailyRemaining).toBe(700000);
      expect(res.dailyRemainingCount).toBe(3);
    });

    it('la liste d’administration ne sélectionne aucune donnée secrète du bénéficiaire', async () => {
      prisma.payout.findMany.mockResolvedValue([]);
      await service.listAll();
      const select = prisma.payout.findMany.mock.calls[0][0].select;
      expect(JSON.stringify(select)).not.toContain('assword');
      expect(select.user).toEqual({ select: { id: true, firstName: true, lastName: true, role: true } });
    });
  });

  describe('confirmation par mot de passe', () => {
    it('bloque (429) à la 5e erreur', async () => {
      prisma.user.update.mockResolvedValue({ payoutAuthAttempts: 5 });
      const attempt = service.create(5, 5000, 'Faux12345');
      await expect(attempt).rejects.toThrow(HttpException);
      await expect(attempt).rejects.toMatchObject({ status: 429 });
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ payoutAuthAttempts: 0, payoutAuthLockedUntil: expect.any(Date) }),
      }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYOUT_AUTH_LOCKED', entityId: 5 }));
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('avant la limite : 400 « Mot de passe incorrect », aucun blocage (jamais 401)', async () => {
      prisma.user.update.mockResolvedValue({ payoutAuthAttempts: 2 });
      const attempt = service.create(5, 5000, 'Faux12345');
      await expect(attempt).rejects.toThrow('Mot de passe incorrect.');
      await expect(attempt).rejects.toMatchObject({ status: 400 });
      expect(prisma.user.update).not.toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ payoutAuthLockedUntil: expect.any(Date) }),
      }));
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('une confirmation bloquée refuse même le bon mot de passe (429), sans rien débiter', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ payoutAuthLockedUntil: future() }));
      await expect(service.create(5, 5000, PASSWORD)).rejects.toMatchObject({ status: 429 });
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('le bon mot de passe remet le compteur d’erreurs à zéro', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ payoutAuthAttempts: 3 }));
      arm();
      await service.create(5, 5000, PASSWORD);
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { payoutAuthAttempts: 0, payoutAuthLockedUntil: null },
      }));
    });

    it('le mot de passe n’est ni journalisé ni transmis au fournisseur', async () => {
      arm();
      await service.create(5, 5000, PASSWORD);
      expect(JSON.stringify(audit.log.mock.calls)).not.toContain(PASSWORD);
      expect(JSON.stringify(provider.withdraw.mock.calls)).not.toContain(PASSWORD);
    });
  });

  describe('numéro de retrait (administration)', () => {
    const target = (over: any = {}) => ({ id: 5, role: 'COMMERCANT', firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.mg', payoutPhone: '0341234567', ...over });
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(target());
      prisma.user.findFirst.mockResolvedValue(null);
    });

    it('404 si le compte est inconnu ; 400 pour un client ou un numéro invalide', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.adminSetPayoutPhone(1, 5, '0331234567', 'Numéro perdu')).rejects.toThrow(NotFoundException);
      prisma.user.findUnique.mockResolvedValue(target({ role: 'CLIENT' }));
      await expect(service.adminSetPayoutPhone(1, 5, '0331234567', 'Numéro perdu')).rejects.toThrow(BadRequestException);
      prisma.user.findUnique.mockResolvedValue(target());
      await expect(service.adminSetPayoutPhone(1, 5, '12345', 'Numéro perdu')).rejects.toThrow(BadRequestException);
      expect(provider.ensureWhitelisted).not.toHaveBeenCalled();
    });

    it('refuse un numéro déjà utilisé par un autre compte (409)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 9 });
      await expect(service.adminSetPayoutPhone(1, 5, '0331234567', 'Numéro perdu')).rejects.toThrow(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('normalise, autorise chez le fournisseur, enregistre, audite avec le motif et prévient le titulaire', async () => {
      const res = await service.adminSetPayoutPhone(1, 5, '+261 33 12 345 67', 'Numéro perdu');
      expect(res).toEqual({ payoutPhone: '0331234567' });
      expect(provider.ensureWhitelisted).toHaveBeenCalledWith('0331234567', 'Jean Dupont', 500000);
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5 }, data: { payoutPhone: '0331234567' } }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 1, action: 'PAYOUT_PHONE_CHANGED', previousValue: '0341234567', newValue: '0331234567 (motif : Numéro perdu)',
      }));
      expect(mail.sendPayoutPhoneChangedEmail).toHaveBeenCalledWith('jean@example.mg', '0331234567');
    });

    it('si le fournisseur refuse, le numéro n’est pas modifié', async () => {
      provider.ensureWhitelisted.mockRejectedValue(new Error('indisponible'));
      await expect(service.adminSetPayoutPhone(1, 5, '0331234567', 'Numéro perdu')).rejects.toThrow('indisponible');
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('le même numéro ne change rien', async () => {
      await service.adminSetPayoutPhone(1, 5, '034 12 345 67', 'Numéro perdu');
      expect(provider.ensureWhitelisted).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(mail.sendPayoutPhoneChangedEmail).not.toHaveBeenCalled();
    });
  });

  describe('preview', () => {
    it('donne montant, frais à la charge du bénéficiaire, total débité, numéro et solde retirable', async () => {
      prisma.walletEntry.aggregate.mockResolvedValue({ _sum: { amount: 9000 } });
      expect(await service.preview(5, 5000)).toEqual({ amount: 5000, fees: 100, totalDebited: 5100, phone: '0341234567', available: 9000 });
      expect(provider.withdraw).not.toHaveBeenCalled();
    });

    it('signale tout de suite un plafond journalier dépassé', async () => {
      prisma.payout.aggregate.mockResolvedValue({ _sum: { amount: 998000 }, _count: { _all: 1 } });
      await expect(service.preview(5, 5000)).rejects.toThrow('Plafond');
    });
  });

  const arm = (balance = 10000) => {
    prisma.walletEntry.aggregate.mockResolvedValue({ _sum: { amount: balance } });
    prisma.payout.create.mockResolvedValue({ id: 9 });
    prisma.payout.updateMany.mockResolvedValue({ count: 1 });
    // l'état lu en base reflète le règlement : « en attente » tant que rien n'a été réglé
    prisma.payout.findUnique.mockImplementation(async () => ({
      id: 9, userId: 5, totalDebited: 5100, amount: 5000, fees: 100, phone: '0341234567', user: { email: 'jean@example.mg' },
      status: prisma.payout.updateMany.mock.calls.length > 0 ? 'REUSSI' : 'EN_ATTENTE',
    }));
  };

  describe('create', () => {
    it('exige un numéro de retrait enregistré', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ payoutPhone: null }));
      await expect(service.create(5, 5000, PASSWORD)).rejects.toThrow('numéro de retrait');
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('refuse un montant hors limites (minimum 1 000 Ar, maximum 500 000 Ar)', async () => {
      await expect(service.create(5, 500, PASSWORD)).rejects.toThrow('minimum');
      await expect(service.create(5, 600000, PASSWORD)).rejects.toThrow('maximum');
      await expect(service.create(5, 1500.5, PASSWORD)).rejects.toThrow(BadRequestException);
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('refuse si le solde retirable ne couvre pas montant + frais, sans rien créer', async () => {
      arm(5050); // 5000 + 100 de frais > 5050
      await expect(service.create(5, 5000, PASSWORD)).rejects.toThrow('Solde insuffisant');
      expect(prisma.payout.create).not.toHaveBeenCalled();
      expect(prisma.walletEntry.create).not.toHaveBeenCalled();
      expect(provider.withdraw).not.toHaveBeenCalled();
    });

    it('plafond journalier en montant : refusé sans rien débiter', async () => {
      arm();
      prisma.payout.aggregate.mockResolvedValue({ _sum: { amount: 998000 }, _count: { _all: 1 } });
      await expect(service.create(5, 5000, PASSWORD)).rejects.toThrow('il vous reste 2000 Ar');
      expect(prisma.payout.create).not.toHaveBeenCalled();
      expect(provider.withdraw).not.toHaveBeenCalled();
    });

    it('plafond journalier en nombre : le 6e retrait des 24 h est refusé', async () => {
      arm();
      prisma.payout.aggregate.mockResolvedValue({ _sum: { amount: 10000 }, _count: { _all: 5 } });
      await expect(service.create(5, 5000, PASSWORD)).rejects.toThrow('5 retraits maximum');
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('le plafond ne compte que les retraits non échoués des dernières 24 h', async () => {
      arm();
      await service.create(5, 5000, PASSWORD);
      const where = prisma.payout.aggregate.mock.calls[0][0].where;
      expect(where).toMatchObject({ userId: 5, status: { not: 'ECHOUE' } });
      const since = where.createdAt.gte.getTime();
      expect(Date.now() - since).toBeGreaterThan(24 * 3_600_000 - 5000);
      expect(Date.now() - since).toBeLessThan(24 * 3_600_000 + 5000);
    });

    it('verrouille le bénéficiaire avant de lire le solde et les plafonds (pas de double dépense)', async () => {
      arm();
      await service.create(5, 5000, PASSWORD);
      const lock = prisma.user.update.mock.invocationCallOrder.find((_: number, i: number) =>
        prisma.user.update.mock.calls[i][0].data.updatedAt,
      );
      expect(lock).toBeLessThan(prisma.walletEntry.aggregate.mock.invocationCallOrder[0]);
      expect(lock).toBeLessThan(prisma.payout.aggregate.mock.invocationCallOrder[0]);
    });

    it('succès : débite montant + frais, envoie au fournisseur, règle en REUSSI, audite et prévient par e-mail', async () => {
      arm();
      await service.create(5, 5000, PASSWORD);

      expect(prisma.payout.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: 5, phone: '0341234567', amount: 5000, fees: 100, totalDebited: 5100, status: 'EN_ATTENTE',
          reference: expect.stringMatching(/^BAMP-[0-9A-F]{12}$/),
        }),
      }));
      expect(prisma.walletEntry.create).toHaveBeenCalledWith({
        data: { userId: 5, payoutId: 9, type: 'RETRAIT', amount: -5100 },
      });
      const reference = prisma.payout.create.mock.calls[0][0].data.reference;
      expect(provider.withdraw).toHaveBeenCalledWith({ phone: '0341234567', amount: 5000, reference });
      expect(prisma.payout.updateMany).toHaveBeenCalledWith({
        where: { id: 9, status: 'EN_ATTENTE' },
        data: expect.objectContaining({ status: 'REUSSI', providerReference: 'OP-1' }),
      });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYOUT_REQUESTED', entityId: 9 }));
      expect(prisma.walletEntry.create).toHaveBeenCalledTimes(1); // pas de recrédit en cas de succès
      expect(mail.sendPayoutEmail).toHaveBeenCalledTimes(1); // un seul e-mail, au règlement
    });

    it('échec définitif du fournisseur : retrait ECHOUE et débit annulé (montant + frais recrédités)', async () => {
      arm();
      provider.withdraw.mockResolvedValue({ status: 'failed', error: 'Numéro invalide' });
      await service.create(5, 5000, PASSWORD);
      expect(prisma.payout.updateMany).toHaveBeenCalledWith({
        where: { id: 9, status: 'EN_ATTENTE' },
        data: expect.objectContaining({ status: 'ECHOUE', error: 'Numéro invalide' }),
      });
      expect(prisma.walletEntry.create).toHaveBeenCalledWith({
        data: { userId: 5, payoutId: 9, type: 'RETRAIT_ANNULE', amount: 5100 },
      });
    });

    it('fournisseur injoignable : EN_ATTENTE, PAS de recrédit (l’argent est peut-être parti), e-mail « en cours »', async () => {
      arm();
      provider.withdraw.mockRejectedValue(new Error('ECONNRESET'));
      await service.create(5, 5000, PASSWORD);
      expect(prisma.payout.updateMany).not.toHaveBeenCalled();
      expect(prisma.walletEntry.create).toHaveBeenCalledTimes(1); // le débit seulement
      expect(mail.sendPayoutEmail).toHaveBeenCalledWith('jean@example.mg', { amount: 5000, fees: 100, phone: '0341234567', status: 'EN_ATTENTE' });
    });

    it('réponse « en cours » : le retrait reste EN_ATTENTE', async () => {
      arm();
      provider.withdraw.mockResolvedValue({ status: 'pending' });
      await service.create(5, 5000, PASSWORD);
      expect(prisma.payout.updateMany).not.toHaveBeenCalled();
    });

    it('une panne de messagerie n’affecte pas le retrait', async () => {
      arm();
      mail.sendPayoutEmail.mockRejectedValue(new Error('SMTP down'));
      const res: any = await service.create(5, 5000, PASSWORD);
      expect(res.id).toBe(9);
      expect(prisma.walletEntry.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('settle', () => {
    it('404 si le retrait est inconnu', async () => {
      prisma.payout.findUnique.mockResolvedValue(null);
      await expect(service.settle(1, 'REUSSI')).rejects.toThrow(NotFoundException);
    });

    it('résultat rejoué : ni recrédit, ni audit, ni e-mail en double', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 9, userId: 5, totalDebited: 5100, status: 'ECHOUE' });
      prisma.payout.updateMany.mockResolvedValue({ count: 0 });
      expect(await service.settle(9, 'ECHOUE')).toEqual({ changed: false });
      expect(prisma.walletEntry.create).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
      expect(mail.sendPayoutEmail).not.toHaveBeenCalled();
    });

    it('règlement tardif (webhook) : e-mail envoyé au titulaire', async () => {
      arm();
      expect(await service.settle(9, 'REUSSI', { providerReference: 'OP-2' })).toEqual({ changed: true });
      expect(mail.sendPayoutEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('SimulatedPayoutProvider', () => {
    it('frais fictifs de 2 % par défaut et retrait toujours réussi', async () => {
      const sim = new SimulatedPayoutProvider();
      expect(await sim.preview('0341234567', 5000)).toEqual({ fees: 100 });
      const res = await sim.withdraw();
      expect(res.status).toBe('success');
      expect(res.providerReference).toMatch(/^SIMOP-/);
    });
  });
});
