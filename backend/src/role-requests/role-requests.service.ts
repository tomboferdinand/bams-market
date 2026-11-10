import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { MailService } from '../common/mail/mail.service';
import { generateToken, hashToken } from '../auth/tokens';
import { getMaxPayoutAmount } from '../common/payout-config';
import { PayoutProvider } from '../payouts/payout-provider';
import { normalizeMobile } from '../payouts/phone';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';

const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const PUBLIC_SELECT = {
  id: true,
  requestedRole: true,
  payoutPhone: true,
  message: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  decidedAt: true,
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, verificationStatus: true } },
} as const;

/**
 * Demandes « devenir commerçant / livreur ».
 *  - Un client dont l'e-mail est vérifié dépose une demande (une seule en attente à la fois).
 *  - Seul un administrateur la tranche. À l'approbation : le numéro de retrait est autorisé chez le fournisseur et
 *    un lien d'activation (valable 7 jours) part par e-mail ; le rôle NE change PAS encore.
 *  - Le rôle et le numéro de retrait sont enregistrés ensemble quand le demandeur ouvre le lien. Un numéro ne peut
 *    servir qu'à un seul compte.
 *  - Le passage « en attente → décidée » est réclamé par la requête : une décision rejouée ne fait rien.
 */
@Injectable()
export class RoleRequestsService {
  private readonly logger = new Logger(RoleRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly provider: PayoutProvider,
  ) {}

  // ───────────────────────── Côté demandeur ─────────────────────────

  mine(userId: number) {
    return this.prisma.roleRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: PUBLIC_SELECT,
    });
  }

  async create(userId: number, dto: CreateRoleRequestDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (user.role !== 'CLIENT') {
      throw new ForbiddenException('Seuls les comptes clients peuvent faire une demande de rôle.');
    }

    const phone = normalizeMobile(dto.payoutPhone);
    if (!phone) throw new BadRequestException('Numéro Mobile Money invalide (exemple : 034 12 345 67).');

    const pending = await this.prisma.roleRequest.findFirst({
      where: { userId, status: { in: ['EN_ATTENTE', 'A_ACTIVER'] } },
      select: { id: true },
    });
    if (pending) throw new ConflictException('Vous avez déjà une demande en cours.');

    await this.assertPhoneFree(phone, userId);

    const created = await this.prisma.roleRequest.create({
      data: { userId, requestedRole: dto.requestedRole, payoutPhone: phone, message: dto.message?.trim() || null },
      select: PUBLIC_SELECT,
    });
    await this.audit.log({
      actorId: userId, action: 'ROLE_REQUESTED', entityType: 'RoleRequest', entityId: created.id,
      previousValue: 'AUCUN', newValue: `EN_ATTENTE:${dto.requestedRole}`,
    });
    return created;
  }

  async cancel(userId: number, id: number) {
    const claimed = await this.prisma.roleRequest.updateMany({
      where: { id, userId, status: { in: ['EN_ATTENTE', 'A_ACTIVER'] } },
      data: { status: 'ANNULEE', decidedAt: new Date(), activationTokenHash: null, activationExpiresAt: null },
    });
    if (claimed.count === 0) throw new NotFoundException('Aucune demande en attente à annuler.');
    await this.audit.log({
      actorId: userId, action: 'ROLE_REQUEST_CANCELLED', entityType: 'RoleRequest', entityId: id,
      previousValue: 'EN_COURS', newValue: 'ANNULEE',
    });
    return { success: true };
  }

  // ───────────────────────── Côté administrateur ─────────────────────────

  listForAdmin(status?: string) {
    const allowed = ['EN_ATTENTE', 'A_ACTIVER', 'APPROUVEE', 'REFUSEE', 'ANNULEE'];
    return this.prisma.roleRequest.findMany({
      where: status && allowed.includes(status) ? { status: status as 'EN_ATTENTE' } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: ADMIN_SELECT,
    });
  }

  async approve(adminId: number, id: number) {
    const request = await this.prisma.roleRequest.findUnique({
      where: { id },
      select: {
        id: true, status: true, userId: true, requestedRole: true, payoutPhone: true,
        user: { select: { id: true, role: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!request) throw new NotFoundException('Demande introuvable.');
    if (request.status !== 'EN_ATTENTE') throw new ConflictException('Cette demande a déjà été traitée.');
    if (request.user.role !== 'CLIENT') throw new ConflictException('Ce compte n’est plus un compte client.');

    await this.assertPhoneFree(request.payoutPhone, request.userId);

    // Autorisation chez le fournisseur AVANT toute modification : en cas d'échec, la demande reste en attente.
    try {
      await this.provider.ensureWhitelisted(
        request.payoutPhone,
        `${request.user.firstName} ${request.user.lastName}`,
        getMaxPayoutAmount(),
      );
    } catch (err) {
      this.logger.error(`Liste blanche refusée pour la demande ${id} : ${(err as Error).message}`);
      throw new BadGatewayException(
        'Le fournisseur de paiement n’a pas pu enregistrer ce numéro. La demande reste en attente : réessayez.',
      );
    }

    if (!request.user.email) {
      throw new ConflictException('Ce compte n’a pas d’adresse e-mail : impossible d’envoyer le lien d’activation.');
    }

    // Le rôle ne change pas ici : il changera quand le demandeur ouvrira le lien reçu par e-mail.
    const { token, hash } = generateToken();
    const claimed = await this.prisma.roleRequest.updateMany({
      where: { id, status: 'EN_ATTENTE' },
      data: {
        status: 'A_ACTIVER', decidedById: adminId, decidedAt: new Date(),
        activationTokenHash: hash, activationExpiresAt: new Date(Date.now() + ACTIVATION_TTL_MS),
      },
    });
    if (claimed.count === 0) throw new ConflictException('Cette demande a déjà été traitée.');

    await this.audit.log({
      actorId: adminId, action: 'ROLE_REQUEST_APPROVED', entityType: 'RoleRequest', entityId: id,
      previousValue: 'EN_ATTENTE', newValue: `A_ACTIVER:${request.requestedRole}`,
    });
    const emailSent = await this.mail.sendRoleActivationEmail(request.user.email, token, request.requestedRole);
    const updated = await this.prisma.roleRequest.findUnique({ where: { id }, select: ADMIN_SELECT });
    return { ...updated, emailSent };
  }

  /** Le demandeur ouvre le lien reçu par e-mail : seul moment où le rôle et le numéro de retrait sont enregistrés. */
  async activate(token: string) {
    const invalid = new BadRequestException('Lien d’activation invalide ou expiré.');
    if (typeof token !== 'string' || token.length === 0) throw invalid;

    const request = await this.prisma.roleRequest.findUnique({
      where: { activationTokenHash: hashToken(token) },
      select: { id: true, status: true, userId: true, requestedRole: true, payoutPhone: true, activationExpiresAt: true },
    });
    if (!request || request.status !== 'A_ACTIVER' || !request.activationExpiresAt || request.activationExpiresAt < new Date()) {
      throw invalid;
    }

    await this.assertPhoneFree(request.payoutPhone, request.userId);

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.roleRequest.updateMany({
        where: { id: request.id, status: 'A_ACTIVER' },
        data: { status: 'APPROUVEE', activationTokenHash: null, activationExpiresAt: null },
      });
      if (claimed.count === 0) throw invalid;
      const updated = await tx.user.updateMany({
        where: { id: request.userId, role: 'CLIENT' },
        data: { role: request.requestedRole, payoutPhone: request.payoutPhone },
      });
      if (updated.count === 0) throw new ConflictException('Ce compte n’est plus un compte client.');
    });

    await this.audit.log({
      actorId: request.userId, action: 'ROLE_REQUEST_ACTIVATED', entityType: 'RoleRequest', entityId: request.id,
      previousValue: 'A_ACTIVER', newValue: 'APPROUVEE',
    });
    await this.audit.log({
      actorId: request.userId, action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: request.userId,
      previousValue: 'CLIENT', newValue: request.requestedRole,
    });
    return { success: true, role: request.requestedRole };
  }

  /** Nouveau lien d'activation (le précédent cesse de fonctionner). Demandeur : 1 envoi par minute ; admin : libre. */
  async resendActivation(id: number, opts: { userId?: number; adminId?: number }) {
    const request = await this.prisma.roleRequest.findFirst({
      where: { id, status: 'A_ACTIVER', ...(opts.userId ? { userId: opts.userId } : {}) },
      select: { id: true, requestedRole: true, updatedAt: true, user: { select: { email: true } } },
    });
    if (!request) throw new NotFoundException('Aucune demande en attente d’activation.');
    if (!request.user.email) throw new ConflictException('Ce compte n’a pas d’adresse e-mail.');
    if (opts.userId && Date.now() - request.updatedAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new HttpException('Un e-mail vient d’être envoyé. Patientez une minute avant de le renvoyer.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const { token, hash } = generateToken();
    await this.prisma.roleRequest.update({
      where: { id },
      data: { activationTokenHash: hash, activationExpiresAt: new Date(Date.now() + ACTIVATION_TTL_MS) },
      select: { id: true },
    });
    const sent = await this.mail.sendRoleActivationEmail(request.user.email, token, request.requestedRole);
    if (!sent) throw new BadGatewayException('Impossible d’envoyer l’e-mail pour le moment. Réessayez dans quelques minutes.');
    return { success: true };
  }

  async reject(adminId: number, id: number, reason: string) {
    const request = await this.prisma.roleRequest.findUnique({
      where: { id },
      select: { id: true, requestedRole: true, user: { select: { email: true } } },
    });
    if (!request) throw new NotFoundException('Demande introuvable.');

    const claimed = await this.prisma.roleRequest.updateMany({
      where: { id, status: 'EN_ATTENTE' },
      data: { status: 'REFUSEE', decidedById: adminId, decidedAt: new Date(), rejectionReason: reason.trim() },
    });
    if (claimed.count === 0) throw new ConflictException('Cette demande a déjà été traitée.');

    await this.audit.log({
      actorId: adminId, action: 'ROLE_REQUEST_REJECTED', entityType: 'RoleRequest', entityId: id,
      previousValue: 'EN_ATTENTE', newValue: 'REFUSEE',
    });
    if (request.user.email) {
      await this.mail.sendRoleRequestRefusedEmail(request.user.email, request.requestedRole, reason.trim());
    }
    return this.prisma.roleRequest.findUnique({ where: { id }, select: ADMIN_SELECT });
  }

  // ───────────────────────── Aides internes ─────────────────────────

  /** Un numéro de retrait ne peut appartenir qu'à un seul compte. */
  private async assertPhoneFree(phone: string, userId: number) {
    const other = await this.prisma.user.findFirst({
      where: { payoutPhone: phone, NOT: { id: userId } },
      select: { id: true },
    });
    if (other) throw new ConflictException('Ce numéro de retrait est déjà utilisé par un autre compte.');
  }
}
