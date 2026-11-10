import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AccountStatus, OrderStatus, Role } from '../../generated/prisma/client';

const USER_SELECT = {
  id: true, email: true, phone: true, firstName: true, lastName: true,
  role: true, accountStatus: true, verificationStatus: true, createdAt: true,
  // Numéro de retrait (commerçants, livreurs) : visible de l'administration, seule habilitée à le modifier.
  payoutPhone: true,
  // passwordHash volontairement exclu (BR-SEC-04)
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getDashboard() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [users, validatedShops, pendingShops, ordersToday, paymentsAgg, recentPendingShops] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.shop.count({ where: { status: 'VALIDEE' } }),
      this.prisma.shop.count({ where: { status: 'EN_ATTENTE_VALIDATION' } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'VALIDEE' } }),
      this.prisma.shop.findMany({
        where: { status: 'EN_ATTENTE_VALIDATION' },
        include: { owner: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      users,
      validatedShops,
      pendingShops,
      ordersToday,
      paymentsVolume: paymentsAgg._sum.amount ?? 0,
      recentPendingShops,
    };
  }

  listUsers(role?: string, accountStatus?: string, search?: string) {
    return this.prisma.user.findMany({
      where: {
        role: Object.values(Role).includes(role as Role) ? (role as Role) : undefined,
        accountStatus: Object.values(AccountStatus).includes(accountStatus as AccountStatus)
          ? (accountStatus as AccountStatus)
          : undefined,
        OR: search
          ? [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ]
          : undefined,
      },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** BR-USR-05 : suspension/désactivation. Jamais de suppression physique (BR-USR-07). */
  async updateUserStatus(adminId: number, userId: number, accountStatus: AccountStatus) {
    if (adminId === userId) {
      throw new BadRequestException('Vous ne pouvez pas modifier le statut de votre propre compte.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (user.accountStatus === accountStatus) {
      throw new BadRequestException('Le compte est déjà dans ce statut.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus },
      select: USER_SELECT,
    });
    await this.audit.log({
      actorId: adminId,
      action: 'USER_STATUS_CHANGE',
      entityType: 'User',
      entityId: userId,
      previousValue: user.accountStatus,
      newValue: accountStatus,
    });
    return updated;
  }

  listOrders(status?: string) {
    return this.prisma.order.findMany({
      where: { status: Object.values(OrderStatus).includes(status as OrderStatus) ? (status as OrderStatus) : undefined },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        items: { include: { product: { select: { name: true, imageUrl: true, shop: { select: { id: true, name: true } } } } } },
        payment: true,
        delivery: { include: { livreur: { select: { firstName: true, lastName: true } } } },
        refund: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: { include: { product: { select: { name: true, imageUrl: true, shop: { select: { id: true, name: true } } } } } },
        address: true,
        payment: true,
        delivery: { include: { livreur: { select: { firstName: true, lastName: true } } } },
        statusHistory: true,
        refund: { include: { admin: { select: { firstName: true, lastName: true } } } },
        // confirmationCode non exposé : il n'est connu que du client (BR-LIV-04)
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');
    const { confirmationCode, ...safe } = order;
    return safe;
  }

  /**
   * Enregistre le remboursement manuel d'une commande : livraison échouée APRÈS un paiement validé.
   * Le montant est celui du paiement enregistré (jamais celui annoncé par le client). Une commande ne
   * peut être remboursée qu'une fois (contrainte d'unicité sur orderId).
   */
  async refundOrder(adminId: number, orderId: number, reference: string, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, delivery: true, refund: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');
    if (order.refund) throw new BadRequestException('Cette commande a déjà été remboursée.');
    if (order.status !== 'ECHOUEE' || order.delivery?.status !== 'ECHEC') {
      throw new BadRequestException("Seule une commande dont la livraison a échoué peut être remboursée.");
    }
    if (order.payment?.status !== 'VALIDEE') {
      throw new BadRequestException("Cette commande n'a pas été payée : il n'y a rien à rembourser.");
    }

    const amount = order.payment.amount;
    let refund;
    try {
      refund = await this.prisma.refund.create({
        data: { orderId, amount, reference: reference.trim(), note: note?.trim() || null, adminId },
      });
    } catch (e: any) {
      // Deux clics simultanés : la contrainte d'unicité refuse le second.
      if (e?.code === 'P2002') throw new BadRequestException('Cette commande a déjà été remboursée.');
      throw e;
    }
    await this.audit.log({
      actorId: adminId,
      action: 'ORDER_REFUND',
      entityType: 'Order',
      entityId: orderId,
      
      newValue: `${amount} MGA (réf. ${refund.reference})`,
    });
    return refund;
  }

  listAuditLogs(entityType?: string) {
    return this.audit.findAll(entityType);
  }
}