import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { releaseStock } from '../common/stock';
import { isPaymentSimulation } from './payment-mode';
import { GoalpayClient } from './goalpay.client';
import { diagnoseSignature, verifyWebhookSignature } from './goalpay-signature';

const EXPIRATION_MINUTES = Number(process.env.PAYMENT_EXPIRATION_MINUTES ?? 10);
// Une commande dont aucune transaction n'a jamais été initiée libère son stock après ce délai.
const UNPAID_ORDER_EXPIRATION_MINUTES = Number(process.env.ORDER_UNPAID_EXPIRATION_MINUTES ?? 30);
const SWEEP_BATCH_SIZE = 100;
// Marge laissée au webhook GoalPay (retards, nouvelles tentatives) avant de considérer un paiement expiré.
const GOALPAY_WEBHOOK_GRACE_MINUTES = 2;

type SettleOutcome = 'VALIDEE' | 'ECHOUEE' | 'EXPIREE';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    // Optionnel pour les tests unitaires du mode simulation ; fourni par Nest en exécution.
    @Optional() private readonly goalpay: GoalpayClient = new GoalpayClient(),
  ) {}

  /**
   * Initiation d'un paiement.
   *  - PAYMENT_MODE=simulation : transaction fictive « SIM- » (démo, tests, soutenance).
   *  - PAYMENT_MODE=goalpay : vraie commande de paiement GoalPay ; le client est redirigé vers
   *    checkoutUrl. Sans GOALPAY_ACCESS_KEY, l'initiation est refusée (jamais de fausse transaction).
   */
  async initiate(userId: number, orderId: number) {
    const simulation = isPaymentSimulation();
    if (!simulation && !this.goalpay.isConfigured()) {
      throw new ServiceUnavailableException("Le paiement en ligne n'est pas encore activé.");
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: { include: { product: { select: { name: true } } } } },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');
    if (order.userId !== userId) throw new ForbiddenException('Cette commande ne vous appartient pas.'); // BR-SEC-03

    if (order.status !== 'EN_ATTENTE_PAIEMENT') {
      throw new BadRequestException('Cette commande ne peut plus être payée.');
    }

    // BR-PAY-05 : une seule transaction par commande — on réutilise la même ligne si elle existe déjà.
    if (order.payment && order.payment.status === 'EN_ATTENTE' && order.payment.expiresAt > new Date()) {
      return order.payment; // déjà initiée et encore valide -> idempotent, pas de doublon
    }

    // BR-PAY-04 : la répartition a été figée à la création de la commande (commission sur le sous-total).
    const commissionAmount: number = order.commissionAmount ?? 0;
    const merchantAmount: number = order.merchantAmount ?? 0;

    if (!simulation) {
      return this.initiateGoalpay(order, commissionAmount, merchantAmount);
    }

    const expiresAt = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000); // BR-PAY-03
    const externalReference = `SIM-${randomBytes(8).toString('hex')}`;

    return this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.total,
        commissionAmount,
        merchantAmount,
        externalReference,
        expiresAt,
        status: 'EN_ATTENTE',
      },
      update: {
        amount: order.total,
        commissionAmount,
        merchantAmount,
        externalReference,
        expiresAt,
        status: 'EN_ATTENTE',
      },
    });
  }

  /** Crée la commande de paiement chez GoalPay, puis enregistre notre paiement (BR-PAY-05 : un par commande). */
  private async initiateGoalpay(order: any, commissionAmount: number, merchantAmount: number) {
    // La référence est générée avant l'appel : si GoalPay échoue, rien n'est enregistré chez nous
    // et le client peut simplement réessayer.
    const merchantReference = `BAM-${order.id}-${randomBytes(4).toString('hex').toUpperCase()}`;
    const items = (order.items ?? []).map((i: any) => ({
      label: i.product?.name ?? 'Article',
      unit_price: i.unitPrice,
      quantity: i.quantity,
    }));
    if (order.deliveryFee > 0) items.push({ label: 'Frais de livraison', unit_price: order.deliveryFee, quantity: 1 });

    const checkout = await this.goalpay.createCheckout({
      description: `Commande #${order.id} Bam'S Market`,
      reference: merchantReference,
      amount: order.total,
      items,
    });

    const minutes = Math.min(EXPIRATION_MINUTES, checkout.expiresInMinutes) + GOALPAY_WEBHOOK_GRACE_MINUTES;
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000); // BR-PAY-03
    const fields = {
      amount: order.total,
      commissionAmount,
      merchantAmount,
      externalReference: checkout.orderReference,
      merchantReference,
      checkoutUrl: checkout.checkoutUrl,
      expiresAt,
      status: 'EN_ATTENTE' as const,
    };
    return this.prisma.payment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, ...fields },
      update: fields,
    });
  }

  /**
   * Webhook GoalPay : seule source qui valide un paiement réel.
   * Contrôles : secret configuré, signature, référence connue, montant et devise identiques,
   * idempotence (un paiement déjà réglé n'est pas retraité), confirmation tardive signalée.
   * Un code HTTP non 2xx fait rejouer le webhook par GoalPay (3 essais) : on ne l'utilise que
   * pour les erreurs récupérables (référence inconnue, secret absent), pas pour les anomalies
   * permanentes (montant différent), qui sont journalisées pour l'administrateur.
   */
  async handleGoalpayWebhook(signature: string | undefined, payload: any) {
    const secret = process.env.GOALPAY_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException('Webhook de paiement non configuré.');

    if (!verifyWebhookSignature(secret, signature, payload)) {
      if (process.env.GOALPAY_DEBUG_WEBHOOK === 'true') {
        this.logger.warn(`Signature webhook invalide : ${JSON.stringify(diagnoseSignature(secret, signature, payload))}`);
      }
      throw new UnauthorizedException('Signature invalide.');
    }

    const event: unknown = payload?.event;
    const data = payload?.data;
    if (typeof event !== 'string' || !data || typeof data.reference !== 'string') {
      throw new BadRequestException('Notification invalide.');
    }

    const payment = await this.prisma.payment.findUnique({ where: { merchantReference: data.reference } });
    if (!payment) throw new NotFoundException('Paiement inconnu.');

    if (payment.externalReference && data.order_reference && data.order_reference !== payment.externalReference) {
      await this.systemAudit(payment.id, payment.status, `ANOMALIE_REFERENCE:${event}`);
      return { received: true, status: 'ignored' };
    }

    if (event === 'payment.canceled') {
      // Annulation volontaire : la commande reste à payer ; le paiement expire normalement.
      return { received: true, status: 'noop' };
    }

    const target: SettleOutcome | null =
      event === 'payment.success' ? 'VALIDEE'
      : event === 'payment.failed' ? 'ECHOUEE'
      : event === 'payment.expired' ? 'EXPIREE'
      : null;
    if (!target) return { received: true, status: 'ignored' };

    if (target === 'VALIDEE') {
      const amountOk = Number(data.amount) === payment.amount;
      const currencyOk = data.currency === undefined || data.currency === 'Ar';
      if (!amountOk || !currencyOk) {
        // Argent reçu qui ne correspond pas à la commande : jamais de validation automatique.
        this.logger.error(`Paiement ${payment.id} : montant/devise reçus différents de ceux attendus.`);
        await this.systemAudit(payment.id, payment.status, 'ANOMALIE_MONTANT');
        return { received: true, status: 'ignored' };
      }
    }

    if (payment.status !== 'EN_ATTENTE') {
      if (target === 'VALIDEE' && payment.status !== 'VALIDEE') {
        // Paiement reçu après expiration/échec : à rembourser ou rattacher à la main (voir lot paiement).
        this.logger.error(`Paiement ${payment.id} reçu alors qu'il est ${payment.status} : à traiter.`);
        await this.systemAudit(payment.id, payment.status, 'CONFIRMATION_TARDIVE_A_REMBOURSER');
      }
      return { received: true, status: 'already-processed' };
    }

    try {
      const { changed } = await this.settle(payment.id, payment.orderId, target);
      if (changed) await this.systemAudit(payment.id, 'EN_ATTENTE', target);
    } catch (err) {
      if (err instanceof ConflictException) {
        // La commande n'est plus payable alors que l'argent est reçu.
        this.logger.error(`Paiement ${payment.id} reçu mais la commande ${payment.orderId} n'est plus payable.`);
        await this.systemAudit(payment.id, payment.status, 'CONFIRMATION_TARDIVE_A_REMBOURSER');
        return { received: true, status: 'needs-refund' };
      }
      throw err;
    }
    return { received: true, status: target };
  }

  /** Dernier paiement du client connecté : sert à la page de retour de GoalPay (adresses fixes, sans identifiant). */
  async getLatestForUser(userId: number) {
    const latest = await this.prisma.payment.findFirst({
      where: { order: { userId } },
      orderBy: { createdAt: 'desc' },
      select: { orderId: true },
    });
    if (!latest) throw new NotFoundException('Aucun paiement trouvé.');
    return this.getStatus(userId, latest.orderId);
  }

  // Action système (webhook) : pas d'acteur humain.
  private systemAudit(paymentId: number, previousValue: string, newValue: string) {
    return this.audit.log({
      actorId: null as unknown as number,
      action: 'PAYMENT_STATUS_CHANGE',
      entityType: 'Payment',
      entityId: paymentId,
      previousValue,
      newValue,
    });
  }

  /** Vérifie l'expiration à la volée et renvoie l'état courant (le balayage périodique complète). */
  async getStatus(userId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) throw new NotFoundException('Commande introuvable.');
    if (order.userId !== userId) throw new ForbiddenException('Cette commande ne vous appartient pas.');
    if (!order.payment) throw new NotFoundException('Aucun paiement initié pour cette commande.');

    if (order.payment.status === 'EN_ATTENTE' && order.payment.expiresAt < new Date()) {
      return (await this.settle(order.payment.id, orderId, 'EXPIREE')).payment; // BR-PAY-03
    }
    return order.payment;
  }

  /**
   * Règle un paiement en attente de façon atomique : paiement, commande et stock sont mis à jour
   * dans la même transaction.
   *  - Le passage « EN_ATTENTE → résultat » est réclamé par la requête elle-même : si un autre
   *    traitement (expiration, double clic, callback répété) est passé avant, rien n'est refait
   *    et le stock n'est jamais restitué deux fois (BR-PAY-02).
   *  - Un échec ou une expiration restitue le stock réservé à la création de la commande.
   *  - Une confirmation arrivant alors que la commande n'est plus payable est refusée (409) et
   *    la transaction est annulée : le traitement des confirmations tardives d'un vrai paiement
   *    GoalPay sera traité avec l'intégration réelle.
   */
  private async settle(paymentId: number, orderId: number, outcome: SettleOutcome) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: 'EN_ATTENTE' },
        data: { status: outcome },
      });
      if (claimed.count === 0) {
        return { payment: await tx.payment.findUnique({ where: { id: paymentId } }), changed: false };
      }

      const orderStatus = outcome === 'VALIDEE' ? 'PAYEE' : 'ECHOUEE';
      const orderClaimed = await tx.order.updateMany({
        where: { id: orderId, status: 'EN_ATTENTE_PAIEMENT' },
        data: { status: orderStatus },
      });
      if (orderClaimed.count === 0) {
        if (outcome === 'VALIDEE') {
          throw new ConflictException("La commande n'est plus en attente de paiement.");
        }
        // Commande déjà clôturée (et son stock déjà restitué) : seul le paiement est réglé.
        return { payment: await tx.payment.findUnique({ where: { id: paymentId } }), changed: true };
      }

      await tx.order.update({
        where: { id: orderId },
        data: { statusHistory: { create: { status: orderStatus } } },
        select: { id: true },
      });

      if (outcome !== 'VALIDEE') {
        const lines = await tx.orderItem.findMany({
          where: { orderId },
          select: { productId: true, quantity: true },
        });
        await releaseStock(tx, lines);
      }

      return { payment: await tx.payment.findUnique({ where: { id: paymentId } }), changed: true };
    });
  }

  /**
   * SIMULATION — remplace le webhook réel envoyé par GoalPay pour confirmer une transaction.
   * En production, cet endpoint ne serait pas déclenché par le client mais par GoalPay lui-même,
   * avec vérification de signature au lieu d'un contrôle JWT+ownership.
   *
   * Interdit hors mode simulation (PAYMENT_MODE=goalpay) : sinon un client pourrait
   * valider son propre paiement sans payer.
   */
  async simulateCallback(userId: number, paymentId: number, outcome: 'SUCCESS' | 'FAILURE') {
    if (!isPaymentSimulation()) {
      throw new ForbiddenException('La simulation de paiement est désactivée.');
    }

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment) throw new NotFoundException('Paiement introuvable.');
    if (payment.order.userId !== userId) throw new ForbiddenException('Ce paiement ne vous appartient pas.');

    // BR-PAY-02 : idempotence — un paiement déjà traité ne peut pas être re-traité.
    if (payment.status !== 'EN_ATTENTE') {
      return payment;
    }

    if (payment.expiresAt < new Date()) {
      // délai dépassé, on ignore le résultat demandé
      return (await this.settle(payment.id, payment.orderId, 'EXPIREE')).payment;
    }

    const newStatus: SettleOutcome = outcome === 'SUCCESS' ? 'VALIDEE' : 'ECHOUEE';
    const { payment: updatedPayment, changed } = await this.settle(payment.id, payment.orderId, newStatus);

    if (changed) {
      await this.audit.log({
        actorId: userId, action: 'PAYMENT_STATUS_CHANGE', entityType: 'Payment', entityId: paymentId,
        previousValue: 'EN_ATTENTE', newValue: newStatus,
      });
    }
    return updatedPayment;
  }

  /**
   * Balayage périodique (voir PaymentsExpirySweeper) : sans lui, une commande abandonnée garderait
   * son stock réservé indéfiniment tant que personne ne consulte son paiement.
   *  1. paiements en attente dont le délai est dépassé -> EXPIREE, commande ECHOUEE, stock restitué ;
   *  2. commandes en attente de paiement sans aucune transaction initiée depuis trop longtemps
   *     -> ECHOUEE, stock restitué.
   */
  async expireOverdue(now: Date = new Date()): Promise<{ payments: number; orders: number }> {
    let payments = 0;
    let orders = 0;

    const overduePayments = await this.prisma.payment.findMany({
      where: { status: 'EN_ATTENTE', expiresAt: { lt: now } },
      select: { id: true, orderId: true },
      take: SWEEP_BATCH_SIZE,
    });
    for (const p of overduePayments) {
      const { changed } = await this.settle(p.id, p.orderId, 'EXPIREE');
      if (changed) payments += 1;
    }

    const cutoff = new Date(now.getTime() - UNPAID_ORDER_EXPIRATION_MINUTES * 60 * 1000);
    const staleOrders = await this.prisma.order.findMany({
      where: { status: 'EN_ATTENTE_PAIEMENT', createdAt: { lt: cutoff }, payment: { is: null } },
      select: { id: true },
      take: SWEEP_BATCH_SIZE,
    });
    for (const o of staleOrders) {
      if (await this.expireUnpaidOrder(o.id)) orders += 1;
    }

    return { payments, orders };
  }

  private async expireUnpaidOrder(orderId: number): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // La condition « aucune transaction initiée » est vérifiée dans la requête elle-même.
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'EN_ATTENTE_PAIEMENT', payment: { is: null } },
        data: { status: 'ECHOUEE' },
      });
      if (claimed.count === 0) return false;

      await tx.order.update({
        where: { id: orderId },
        data: { statusHistory: { create: { status: 'ECHOUEE' } } },
        select: { id: true },
      });
      const lines = await tx.orderItem.findMany({
        where: { orderId },
        select: { productId: true, quantity: true },
      });
      await releaseStock(tx, lines);
      return true;
    });
  }

  /** Récupération des paiements pour l'Espace Admin */
  findAllForAdmin() {
    return this.prisma.payment.findMany({
      include: { order: { select: { id: true, userId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
