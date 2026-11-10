import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { getWalletHoldHours } from '../common/payout-config';
import { releaseStock } from '../common/stock';

const MAX_ACTIVE_MISSIONS = Number(process.env.DELIVERY_MAX_ACTIVE_MISSIONS ?? 3);
// Nombre de codes de confirmation erronés tolérés par mission avant blocage (BR-LIV-04).
const MAX_CONFIRM_ATTEMPTS = Number(process.env.DELIVERY_MAX_CONFIRM_ATTEMPTS ?? 5);

// Sélection explicite : on n'inclut JAMAIS confirmationCode dans ce que voit le livreur (BR-LIV-04).
const ORDER_SELECT_FOR_LIVREUR = {
  id: true,
  total: true,
  createdAt: true,
  address: true,
  items: { include: { product: { include: { shop: true } } } },
  user: { select: { firstName: true, lastName: true, phone: true } },
};

// BR-SEC-06 : avant d'accepter, le livreur ne voit que la zone (ville + libellé), le prénom,
// la boutique de retrait et le montant. Jamais le téléphone, l'adresse exacte ni le code.
const ORDER_SELECT_AVAILABLE = {
  id: true,
  total: true,
  createdAt: true,
  address: { select: { label: true, city: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      product: { select: { id: true, name: true, imageUrl: true, shop: { select: { id: true, name: true, address: true } } } },
    },
  },
  user: { select: { firstName: true } },
};

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAvailable() {
    return this.prisma.delivery.findMany({
      where: { status: 'DISPONIBLE' },
      include: { order: { select: ORDER_SELECT_AVAILABLE } },
      orderBy: { createdAt: 'asc' },
    });
  }

  findMine(livreurId: number) {
    return this.prisma.delivery.findMany({
      where: { livreurId, status: 'EN_COURS' },
      include: { order: { select: ORDER_SELECT_FOR_LIVREUR } },
      orderBy: { acceptedAt: 'asc' },
    });
  }

  findHistory(livreurId: number) {
    return this.prisma.delivery.findMany({
      where: { livreurId, status: { in: ['LIVREE', 'ECHEC'] } },
      include: { order: { select: ORDER_SELECT_FOR_LIVREUR } },
      orderBy: { deliveredAt: 'desc' },
    });
  }

  async accept(livreurId: number, deliveryId: number) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException('Mission introuvable.');
    if (delivery.status !== 'DISPONIBLE') {
      throw new BadRequestException('Cette mission a déjà été prise en charge.'); // BR-LIV-02
    }

    await this.prisma.$transaction(async (tx) => {
      // Verrou de ligne sur le livreur : ses acceptations simultanées passent l'une après l'autre,
      // ce qui rend le contrôle de la limite de missions actives fiable (BR-LIV-03).
      await tx.user.update({
        where: { id: livreurId },
        data: { updatedAt: new Date() },
        select: { id: true },
      });

      const activeCount = await tx.delivery.count({ where: { livreurId, status: 'EN_COURS' } });
      if (activeCount >= MAX_ACTIVE_MISSIONS) {
        throw new BadRequestException(`Vous avez déjà ${MAX_ACTIVE_MISSIONS} livraisons actives.`); // BR-LIV-03
      }

      // La mission est « réclamée » par la requête : si deux livreurs acceptent en même temps,
      // un seul obtient la ligne (BR-LIV-02), l'autre reçoit le refus ci-dessous.
      const claimed = await tx.delivery.updateMany({
        where: { id: deliveryId, status: 'DISPONIBLE' },
        data: { livreurId, status: 'EN_COURS', acceptedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('Cette mission a déjà été prise en charge.'); // BR-LIV-02
      }

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: 'EN_COURS_DE_LIVRAISON',
          statusHistory: { create: { status: 'EN_COURS_DE_LIVRAISON' } },
        },
        select: { id: true },
      });
    });

    await this.audit.log({
      actorId: livreurId, action: 'ORDER_STATUS_CHANGE', entityType: 'Order', entityId: delivery.orderId,
      previousValue: 'EN_PREPARATION', newValue: 'EN_COURS_DE_LIVRAISON',
    });

    // Relecture hors transaction (la transaction ne contient que des écritures).
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: { select: ORDER_SELECT_FOR_LIVREUR } },
    });
  }

  private async findOwnedActive(livreurId: number, deliveryId: number) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });
    if (!delivery) throw new NotFoundException('Mission introuvable.');
    if (delivery.livreurId !== livreurId) throw new ForbiddenException("Cette mission ne vous est pas attribuée.");
    if (delivery.status !== 'EN_COURS') {
      throw new BadRequestException('Cette mission ne peut plus être modifiée à ce stade.'); // BR-LIV-05
    }
    return delivery;
  }

  async confirm(livreurId: number, deliveryId: number, code: string) {
    const delivery = await this.findOwnedActive(livreurId, deliveryId);

    // Le code a 900 000 valeurs possibles : sans limite d'essais, il pourrait être deviné.
    if (delivery.confirmAttempts >= MAX_CONFIRM_ATTEMPTS) {
      throw new HttpException(
        "Trop de codes incorrects : la confirmation est bloquée pour cette mission. Contactez l'administrateur.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (delivery.order.confirmationCode !== code) {
      const { confirmAttempts } = await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: { confirmAttempts: { increment: 1 } },
        select: { confirmAttempts: true },
      });
      throw new BadRequestException(
        confirmAttempts >= MAX_CONFIRM_ATTEMPTS
          ? "Code de confirmation incorrect. Nombre maximal d'essais atteint : contactez l'administrateur."
          : 'Code de confirmation incorrect.', // BR-LIV-04
      );
    }

    // Propriétaire de la boutique concernée (une commande ne concerne qu'une boutique, BR-CMD-07).
    // Lecture faite avant la transaction, qui ne contient que des écritures.
    const line = await this.prisma.orderItem.findFirst({
      where: { orderId: delivery.orderId },
      select: { product: { select: { shop: { select: { ownerId: true } } } } },
    });
    const merchantId = line?.product?.shop?.ownerId;
    if (merchantId === undefined) {
      this.logger.error(`Commande ${delivery.orderId} : boutique introuvable, la part du commerçant n'est pas créditée.`);
    }

    // Répartition figée à la création de la commande (BR-PAY-04) : sous-total − commission au
    // commerçant, frais de livraison au livreur. Elle est créditée ici, à la livraison confirmée.
    // L'argent n'est retirable qu'après un délai de séjour (litiges, remboursements) : WALLET_HOLD_HOURS.
    const availableAt = new Date(Date.now() + getWalletHoldHours() * 60 * 60 * 1000);
    const credits: { userId: number; orderId: number; type: 'VENTE' | 'LIVRAISON'; amount: number; availableAt: Date }[] = [];
    if (merchantId !== undefined && delivery.order.merchantAmount > 0) {
      credits.push({ userId: merchantId, orderId: delivery.orderId, type: 'VENTE', amount: delivery.order.merchantAmount, availableAt });
    }
    if (delivery.order.deliveryFee > 0) {
      credits.push({ userId: livreurId, orderId: delivery.orderId, type: 'LIVRAISON', amount: delivery.order.deliveryFee, availableAt });
    }

    await this.prisma.$transaction(async (tx) => {
      // La mission est « réclamée » par la requête : deux confirmations simultanées ne créditent
      // qu'une fois (la seconde obtient 0 ligne et est refusée, BR-LIV-05).
      const claimed = await tx.delivery.updateMany({
        where: { id: deliveryId, status: 'EN_COURS' },
        data: { status: 'LIVREE', deliveredAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('Cette mission ne peut plus être modifiée à ce stade.'); // BR-LIV-05
      }

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: 'LIVREE', statusHistory: { create: { status: 'LIVREE' } } },
        select: { id: true },
      });

      if (credits.length > 0) await tx.walletEntry.createMany({ data: credits });
    });

    await this.audit.log({
      actorId: livreurId, action: 'ORDER_STATUS_CHANGE', entityType: 'Order', entityId: delivery.orderId,
      previousValue: 'EN_COURS_DE_LIVRAISON', newValue: 'LIVREE',
    });

    // Relecture hors transaction.
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: { select: ORDER_SELECT_FOR_LIVREUR } },
    });
  }

  /**
   * Échec de remise (client absent, adresse introuvable...). Règle minimale :
   *  - la mission passe en ECHEC et la commande en ECHOUEE (historique + audit) ;
   *  - le stock réservé est restitué (la marchandise retourne au commerçant) ;
   *  - aucun crédit : ni le commerçant ni le livreur ne sont payés pour une commande non livrée ;
   *  - le remboursement du client est une action manuelle de l'administration (hors MVP).
   */
  async reportFailure(livreurId: number, deliveryId: number) {
    const delivery = await this.findOwnedActive(livreurId, deliveryId);

    // Lecture faite avant la transaction, qui ne contient que des écritures.
    const items = await this.prisma.orderItem.findMany({
      where: { orderId: delivery.orderId },
      select: { productId: true, quantity: true },
    });

    await this.prisma.$transaction(async (tx) => {
      // La mission est « réclamée » par la requête : deux déclarations simultanées ne restituent
      // le stock qu'une fois (la seconde obtient 0 ligne et est refusée, BR-LIV-05).
      const claimed = await tx.delivery.updateMany({
        where: { id: deliveryId, status: 'EN_COURS' },
        data: { status: 'ECHEC', deliveredAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('Cette mission ne peut plus être modifiée à ce stade.'); // BR-LIV-05
      }

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: 'ECHOUEE', statusHistory: { create: { status: 'ECHOUEE' } } },
        select: { id: true },
      });

      await releaseStock(tx, items);
    });

    await this.audit.log({
      actorId: livreurId, action: 'ORDER_STATUS_CHANGE', entityType: 'Order', entityId: delivery.orderId,
      previousValue: 'EN_COURS_DE_LIVRAISON', newValue: 'ECHOUEE',
    });

    // Relecture hors transaction.
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: { select: ORDER_SELECT_FOR_LIVREUR } },
    });
  }
}
