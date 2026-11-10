import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { MailService } from '../common/mail/mail.service';
import {
  getDailyMaxPayoutAmount,
  getDailyMaxPayoutCount,
  getMaxPayoutAmount,
  getMinPayoutAmount,
  getPayoutAuthLockMinutes,
  getPayoutAuthMaxAttempts,
  getPayoutMode,
  getWalletHoldHours,
} from '../common/payout-config';
import { PayoutProvider } from './payout-provider';
import { normalizeMobile } from './phone';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const PAYOUT_ROLES = ['COMMERCANT', 'LIVREUR'];
const HISTORY_SIZE = 20;

type PayoutOutcome = 'REUSSI' | 'ECHOUE';
type DbClient = Pick<PrismaService, 'walletEntry' | 'payout'>;

const USER_SELECT = {
  id: true,
  role: true,
  firstName: true,
  lastName: true,
  email: true,
  passwordHash: true,
  payoutPhone: true,
  payoutAuthAttempts: true,
  payoutAuthLockedUntil: true,
} as const;

/**
 * Retraits du portefeuille vers le Mobile Money (commerçants et livreurs).
 *
 *  - Le solde retirable est la somme des lignes du livre de comptes dont le délai de séjour est écoulé.
 *  - Le numéro de retrait est enregistré à l'activation du rôle et verrouillé : seul un administrateur
 *    peut le changer (motif obligatoire, audit, e-mail au titulaire).
 *  - Un retrait se fait en deux temps : aperçu (montant, frais, total, numéro), puis confirmation par
 *    le mot de passe du titulaire (blocage temporaire après quelques erreurs). L'e-mail doit être vérifié.
 *  - Plafonds : minimum et maximum par retrait, plus un plafond glissant sur 24 h (montant et nombre).
 *  - Les frais du fournisseur sont à la charge du bénéficiaire : on débite montant + frais.
 *  - Le débit est enregistré AVANT l'appel au fournisseur ; en cas d'échec définitif, une ligne
 *    d'annulation recrédite le bénéficiaire (une seule fois, grâce à la contrainte d'unicité).
 *  - Si le fournisseur ne répond pas, le retrait reste « en attente » et n'est jamais recrédité à l'aveugle :
 *    l'argent a peut-être déjà été envoyé (suivi du statut au lot suivant).
 *  - Chaque retrait est audité et notifié par e-mail au titulaire.
 */
@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly provider: PayoutProvider,
    private readonly mail: MailService,
  ) {}

  // ───────────────────────── Lecture ─────────────────────────

  async getSettings(userId: number) {
    const user = await this.requireEligible(userId);
    const usage = await this.dailyUsage(this.prisma, userId);
    const dailyMaxAmount = getDailyMaxPayoutAmount();
    return {
      mode: getPayoutMode(),
      payoutPhone: user.payoutPhone,
      authLockedUntil: user.payoutAuthLockedUntil && user.payoutAuthLockedUntil > new Date() ? user.payoutAuthLockedUntil : null,
      minAmount: getMinPayoutAmount(),
      maxAmount: getMaxPayoutAmount(),
      dailyMaxAmount,
      dailyRemaining: Math.max(0, dailyMaxAmount - usage.amount),
      dailyRemainingCount: Math.max(0, getDailyMaxPayoutCount() - usage.count),
      holdHours: getWalletHoldHours(),
    };
  }

  async list(userId: number) {
    await this.requireEligible(userId);
    return this.prisma.payout.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_SIZE,
      select: { id: true, amount: true, fees: true, totalDebited: true, phone: true, status: true, error: true, createdAt: true },
    });
  }

  /** Administration : tous les retraits, avec le nom du bénéficiaire. */
  listAll() {
    return this.prisma.payout.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, amount: true, fees: true, totalDebited: true, phone: true, status: true, error: true,
        reference: true, providerReference: true, createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  // ───────────────────────── Numéro de retrait (administration) ─────────────────────────

  /**
   * Seule voie pour changer un numéro de retrait après l'activation du rôle. Le numéro est autorisé chez le
   * fournisseur AVANT d'être enregistré ; le changement est audité (avec le motif) et notifié au titulaire.
   */
  async adminSetPayoutPhone(adminId: number, userId: number, phone: string, reason: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, firstName: true, lastName: true, email: true, payoutPhone: true },
    });
    if (!target) throw new NotFoundException('Utilisateur introuvable.');
    if (!PAYOUT_ROLES.includes(target.role)) {
      throw new BadRequestException('Seuls les commerçants et les livreurs ont un numéro de retrait.');
    }
    const normalized = normalizeMobile(phone);
    if (!normalized) throw new BadRequestException('Numéro Mobile Money invalide (exemple : 034 12 345 67).');
    if (target.payoutPhone === normalized) return { payoutPhone: normalized };

    const taken = await this.prisma.user.findFirst({
      where: { payoutPhone: normalized, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) throw new ConflictException('Ce numéro est déjà le numéro de retrait d’un autre compte.');

    // Autorisation chez le fournisseur AVANT d'enregistrer : si elle échoue, rien n'est modifié.
    await this.provider.ensureWhitelisted(normalized, `${target.firstName} ${target.lastName}`, getMaxPayoutAmount());

    await this.prisma.user.update({ where: { id: userId }, data: { payoutPhone: normalized }, select: { id: true } });
    await this.audit.log({
      actorId: adminId, action: 'PAYOUT_PHONE_CHANGED', entityType: 'User', entityId: userId,
      previousValue: target.payoutPhone ?? 'AUCUN', newValue: `${normalized} (motif : ${reason.trim()})`,
    });
    if (target.email) await this.mail.sendPayoutPhoneChangedEmail(target.email, normalized);
    return { payoutPhone: normalized };
  }

  // ───────────────────────── Retrait ─────────────────────────

  /** Étape 1 : montants d'un retrait possible, sans rien exécuter. */
  async preview(userId: number, amount: number) {
    const user = await this.requireEligible(userId);
    const phone = this.requirePayoutPhone(user);
    this.checkAmount(amount);
    this.checkDailyCap(await this.dailyUsage(this.prisma, userId), amount);
    const { fees } = await this.provider.preview(phone, amount);
    const available = await this.availableBalance(this.prisma, userId);
    return { amount, fees, totalDebited: amount + fees, phone, available };
  }

  /** Étape 2 : confirmation par le mot de passe, puis exécution. */
  async create(userId: number, amount: number, password: string) {
    const user = await this.requireEligible(userId);
    const phone = this.requirePayoutPhone(user);
    this.checkAmount(amount);
    await this.checkPassword(user, password);

    const { fees } = await this.provider.preview(phone, amount);
    const totalDebited = amount + fees;
    const reference = `BAMP-${randomBytes(6).toString('hex').toUpperCase()}`;

    // Débit réservé de façon atomique : le verrou sur le bénéficiaire fait passer ses retraits
    // simultanés l'un après l'autre, le solde et les plafonds sont donc vérifiés sans risque de double dépense.
    const payout = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() }, select: { id: true } });
      const db = tx as unknown as DbClient;
      this.checkDailyCap(await this.dailyUsage(db, userId), amount);
      const available = await this.availableBalance(db, userId);
      if (available < totalDebited) {
        throw new BadRequestException(
          `Solde insuffisant : ${totalDebited} Ar nécessaires (montant ${amount} + frais ${fees}), ${available} Ar disponibles.`,
        );
      }
      const created = await tx.payout.create({
        data: { userId, phone, amount, fees, totalDebited, reference, status: 'EN_ATTENTE' },
        select: { id: true },
      });
      await tx.walletEntry.create({
        data: { userId, payoutId: created.id, type: 'RETRAIT', amount: -totalDebited },
      });
      return created;
    });

    await this.audit.log({
      actorId: userId, action: 'PAYOUT_REQUESTED', entityType: 'Payout', entityId: payout.id,
      previousValue: 'AUCUN', newValue: `EN_ATTENTE:${totalDebited}:${phone}`,
    });

    // Appel du fournisseur hors transaction.
    try {
      const result = await this.provider.withdraw({ phone, amount, reference });
      if (result.status === 'success') {
        await this.settle(payout.id, 'REUSSI', { providerReference: result.providerReference });
      } else if (result.status === 'failed') {
        await this.settle(payout.id, 'ECHOUE', { error: result.error ?? 'Retrait refusé.' });
      }
      // « pending » : le résultat arrivera plus tard (webhook / suivi de statut).
    } catch {
      // Réponse inconnue (réseau, délai dépassé) : on NE recrédite PAS, l'argent est peut-être parti.
      // Le retrait reste « en attente » et sera réglé par le suivi de statut.
    }

    const result = await this.prisma.payout.findUnique({
      where: { id: payout.id },
      select: { id: true, amount: true, fees: true, totalDebited: true, phone: true, status: true, error: true, createdAt: true },
    });
    // Règlement immédiat : l'e-mail est parti avec settle(). Sinon, on prévient que le retrait est en cours.
    if (result?.status === 'EN_ATTENTE') await this.notify(payout.id);
    return result;
  }

  /**
   * Règle un retrait en attente (réponse immédiate du fournisseur, webhook ou suivi de statut).
   * Le passage « EN_ATTENTE → résultat » est réclamé par la requête : un résultat rejoué ne recrédite
   * ni ne modifie rien. Un échec recrédite le bénéficiaire (montant + frais), une seule fois.
   */
  async settle(payoutId: number, outcome: PayoutOutcome, extra: { providerReference?: string; error?: string } = {}) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      select: { id: true, userId: true, totalDebited: true, status: true },
    });
    if (!payout) throw new NotFoundException('Retrait introuvable.');

    const changed = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payout.updateMany({
        where: { id: payoutId, status: 'EN_ATTENTE' },
        data: { status: outcome, providerReference: extra.providerReference, error: extra.error },
      });
      if (claimed.count === 0) return false;
      if (outcome === 'ECHOUE') {
        await tx.walletEntry.create({
          data: { userId: payout.userId, payoutId, type: 'RETRAIT_ANNULE', amount: payout.totalDebited },
        });
      }
      return true;
    });

    if (changed) {
      await this.audit.log({
        actorId: null as unknown as number, action: 'PAYOUT_STATUS_CHANGE', entityType: 'Payout', entityId: payoutId,
        previousValue: 'EN_ATTENTE', newValue: outcome,
      });
      await this.notify(payoutId);
    }
    return { changed };
  }

  // ───────────────────────── Aides internes ─────────────────────────

  /** E-mail au titulaire sur l'état courant du retrait. Ne bloque ni n'échoue jamais le retrait. */
  private async notify(payoutId: number) {
    try {
      const p = await this.prisma.payout.findUnique({
        where: { id: payoutId },
        select: { amount: true, fees: true, phone: true, status: true, user: { select: { email: true } } },
      });
      if (!p?.user?.email) return;
      await this.mail.sendPayoutEmail(p.user.email, { amount: p.amount, fees: p.fees, phone: p.phone, status: p.status });
    } catch {
      // l'alerte e-mail est un plus : une panne de messagerie ne doit pas affecter le retrait
    }
  }

  private async requireEligible(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (!PAYOUT_ROLES.includes(user.role)) {
      throw new ForbiddenException('Les retraits sont réservés aux commerçants et aux livreurs.');
    }
    return user;
  }

  private requirePayoutPhone(user: { payoutPhone: string | null }) {
    if (!user.payoutPhone) {
      throw new BadRequestException('Aucun numéro de retrait n’est enregistré sur votre compte. Contactez l’administration.');
    }
    return user.payoutPhone;
  }

  private checkAmount(amount: number) {
    const min = getMinPayoutAmount();
    const max = getMaxPayoutAmount();
    if (!Number.isInteger(amount) || amount < min) {
      throw new BadRequestException(`Le montant minimum d'un retrait est ${min} Ar.`);
    }
    if (amount > max) throw new BadRequestException(`Le montant maximum d'un retrait est ${max} Ar.`);
  }

  /** Retraits des dernières 24 h (hors échoués, qui ont été recrédités). */
  private async dailyUsage(client: DbClient, userId: number) {
    const res = await client.payout.aggregate({
      where: { userId, status: { not: 'ECHOUE' }, createdAt: { gte: new Date(Date.now() - DAY) } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    return { amount: res._sum.amount ?? 0, count: res._count._all ?? 0 };
  }

  private checkDailyCap(usage: { amount: number; count: number }, amount: number) {
    const maxCount = getDailyMaxPayoutCount();
    const maxAmount = getDailyMaxPayoutAmount();
    if (usage.count >= maxCount) {
      throw new BadRequestException(`Limite atteinte : ${maxCount} retraits maximum par période de 24 h.`);
    }
    if (usage.amount + amount > maxAmount) {
      const left = Math.max(0, maxAmount - usage.amount);
      throw new BadRequestException(`Plafond de ${maxAmount} Ar par 24 h dépassé : il vous reste ${left} Ar à retirer aujourd’hui.`);
    }
  }

  /** Solde retirable : lignes du livre de comptes dont le délai de séjour est écoulé (les retraits comptent tout de suite). */
  private async availableBalance(client: Pick<PrismaService, 'walletEntry'>, userId: number) {
    const total = await client.walletEntry.aggregate({
      where: { userId, availableAt: { lte: new Date() } },
      _sum: { amount: true },
    });
    return total._sum.amount ?? 0;
  }

  /**
   * Vérifie le mot de passe du titulaire ; compte les erreurs et bloque temporairement après le maximum toléré.
   * Une erreur renvoie 400 (jamais 401, qui déconnecterait l'utilisateur côté interface).
   */
  private async checkPassword(
    user: { id: number; passwordHash: string; payoutAuthAttempts: number; payoutAuthLockedUntil: Date | null },
    password: string,
  ) {
    if (user.payoutAuthLockedUntil && user.payoutAuthLockedUntil > new Date()) {
      throw new HttpException('Confirmation bloquée temporairement après trop d’erreurs. Réessayez plus tard.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (await bcrypt.compare(password, user.passwordHash)) {
      if (user.payoutAuthAttempts > 0 || user.payoutAuthLockedUntil) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { payoutAuthAttempts: 0, payoutAuthLockedUntil: null },
          select: { id: true },
        });
      }
      return;
    }

    const { payoutAuthAttempts } = await this.prisma.user.update({
      where: { id: user.id },
      data: { payoutAuthAttempts: { increment: 1 } },
      select: { payoutAuthAttempts: true },
    });
    if (payoutAuthAttempts >= getPayoutAuthMaxAttempts()) {
      const minutes = getPayoutAuthLockMinutes();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { payoutAuthAttempts: 0, payoutAuthLockedUntil: new Date(Date.now() + minutes * MINUTE) },
        select: { id: true },
      });
      await this.audit.log({
        actorId: user.id, action: 'PAYOUT_AUTH_LOCKED', entityType: 'User', entityId: user.id,
        previousValue: 'ACTIF', newValue: `BLOQUE_${minutes}_MIN`,
      });
      throw new HttpException(
        `Mot de passe incorrect. Trop d’erreurs : retraits bloqués pendant ${minutes} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw new BadRequestException('Mot de passe incorrect.');
  }
}
