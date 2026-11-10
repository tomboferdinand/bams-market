import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CartService } from '../cart/cart.service';
import { randomInt } from 'crypto';
import { AuditService } from '../common/audit/audit.service';
import { computeOrderTotals } from '../common/pricing';
import { computeCommission } from '../common/commission';
import { releaseStock, reserveStock } from '../common/stock';
import { PUBLIC_SHOP_FILTER } from '../common/shop-visibility';
import type { OrderStatus } from '../../generated/prisma/client';

// US-012 / UC-006 : le commerçant ne voit que les commandes dont le paiement est confirmé.
export const MERCHANT_VISIBLE_STATUSES: OrderStatus[] = [
    'PAYEE', 'EN_PREPARATION', 'EN_COURS_DE_LIVRAISON', 'LIVREE',
];

// BR-LIV-04 : le code de confirmation n'est connu que du client propriétaire de la commande.
const HIDE_CONFIRMATION_CODE = { confirmationCode: true } as const;

// La répartition financière (commission de la plateforme) n'a pas à être montrée au client.
const HIDE_PLATFORM_SHARE = { commissionPercent: true, commissionAmount: true, merchantAmount: true } as const;

// BR-SEC-06 (anti-contournement) : le commerçant ne reçoit jamais de coordonnée directe du client
// (téléphone, adresse exacte, nom complet). Il voit le prénom + l'initiale du nom, la ville et
// le libellé de l'adresse. Le livreur reçoit les coordonnées complètes seulement après acceptation.
const MERCHANT_ADDRESS_SELECT = { select: { id: true, label: true, city: true } } as const;
const MERCHANT_USER_SELECT = { select: { firstName: true, lastName: true } } as const;

function maskMerchantOrder<T extends { user?: { firstName: string; lastName: string } | null }>(order: T): T {
    if (!order.user) return order;
    return { ...order, user: { firstName: order.user.firstName, lastName: order.user.lastName.charAt(0) } } as T;
}

@Injectable()
export class OrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cartService: CartService,
        private readonly audit: AuditService,
    ) {}

    async create(userId: number, addressId: number) {
        const address = await this.prisma.address.findUnique({ where: { id: addressId } });
        if (!address || address.userId !== userId) {
            throw new NotFoundException("Adresse introuvable ou n'appartenant pas à ce compte.");
        }

        const { items } = await this.cartService.getMine(userId);
        if (items.length === 0) throw new BadRequestException('Le panier est vide.'); // BR-CMD

        // BR-CMD-07 : une commande ne concerne qu'une seule boutique. Le panier l'impose déjà à
        // l'ajout ; ce contrôle protège aussi un panier hérité ou construit par un appel direct à l'API.
        if (new Set(items.map((i) => i.product.shopId)).size > 1) {
            throw new BadRequestException(
                "Votre panier contient des produits de plusieurs boutiques. Une commande ne peut concerner qu'une seule boutique : retirez les produits d'une des boutiques.",
            );
        }

        // La boutique doit être ouverte : validée et propriétaire actif. Un commerçant suspendu ou
        // désactivé après l'ajout au panier ne peut plus recevoir de commande.
        const shopIds = [...new Set(items.map((i) => i.product.shopId))];
        const openShops = await this.prisma.shop.count({ where: { id: { in: shopIds }, ...PUBLIC_SHOP_FILTER } });
        if (openShops !== shopIds.length) {
            throw new BadRequestException(
                "Cette boutique n'est plus disponible à la vente. Retirez ses produits de votre panier.",
            );
        }

        // Revalidation stricte, côté serveur, juste avant la création (BR-SEC-02, BR-PRD-03)
        for (const item of items) {
            if (!item.product.isActive || item.product.stock < item.quantity) {
                throw new BadRequestException(
                    `Le produit "${item.product.name}" n'est plus disponible dans la quantité demandée.`,
                );
            }
        }

        const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
        const { deliveryFee, total, minOrderAmount, meetsMinimum } = computeOrderTotals(subtotal);
        if (!meetsMinimum) {
            throw new BadRequestException(`Le montant minimum de commande est ${minOrderAmount} MGA.`); // BR-CMD-01
        }
        // BR-PAY-04 : la répartition (commission sur le sous-total, part du commerçant) est figée
        // maintenant ; le livreur recevra deliveryFee à la livraison confirmée.
        const { commissionPercent, commissionAmount, merchantAmount } = computeCommission(subtotal);

        // BR-PRD-04 : réservation du stock et création de la commande dans UNE transaction.
        // La vérification de stock ci-dessus donne un message clair ; la vraie protection contre
        // deux commandes simultanées est la condition « stock suffisant » portée par la requête.
        const created = await this.prisma.$transaction(async (tx) => {
            const unavailable = await reserveStock(
                tx,
                items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            );
            if (unavailable) {
                const name = items.find((i) => i.productId === unavailable.productId)?.product.name ?? 'Un produit';
                throw new BadRequestException(`Le produit "${name}" n'est plus disponible dans la quantité demandée.`);
            }

            return tx.order.create({
                data: {
                    userId,
                    addressId,
                    subtotal,
                    deliveryFee,
                    total,
                    commissionPercent,
                    commissionAmount,
                    merchantAmount,
                    confirmationCode: String(randomInt(100000, 999999)), // BR-LIV-04
                    items: {
                        create: items.map((i) => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            unitPrice: i.product.price, // snapshot figé (BR-CMD-04, BR-PRD-06)
                        })),
                    },
                    statusHistory: {
                        create: { status: 'EN_ATTENTE_PAIEMENT' }, // BR-CMD-06
                    },
                },
                select: { id: true },
            });
        });

        await this.cartService.clear(userId);
        // Relecture hors transaction (la transaction ne contient que des écritures).
        return this.prisma.order.findUnique({
            where: { id: created.id },
            include: { items: true },
            omit: HIDE_PLATFORM_SHARE,
        });
    }

    findMine(userId: number) {
        return this.prisma.order.findMany({
            where: { userId },
            include: { items: { include: { product: true } }, address: true, statusHistory: true, refund: { select: { amount: true, createdAt: true } } },
            omit: HIDE_PLATFORM_SHARE,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOneMine(userId: number, id: number) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: { items: { include: { product: true } }, address: true, statusHistory: true, refund: { select: { amount: true, createdAt: true } } },
            omit: HIDE_PLATFORM_SHARE,
        });
        if (!order) throw new NotFoundException('Commande introuvable.');
        if (order.userId !== userId) throw new ForbiddenException('Cette commande ne vous appartient pas.'); // BR-SEC-03
        return order;
    }

    async cancel(userId: number, id: number) {
        const order = await this.findOneMine(userId, id);

        if (order.status !== 'EN_ATTENTE_PAIEMENT') {
            throw new BadRequestException(
                "Cette commande ne peut plus être annulée directement ; contactez le commerçant ou l'administrateur.",
            ); // BR-CMD-03
        }

        // Annulation atomique : statut, paiement en attente et restitution du stock.
        // Le passage « EN_ATTENTE_PAIEMENT → ANNULEE » est réclamé par la requête : si une expiration
        // ou une autre annulation est passée avant, rien n'est restitué deux fois.
        await this.prisma.$transaction(async (tx) => {
            const claimed = await tx.order.updateMany({
                where: { id, status: 'EN_ATTENTE_PAIEMENT' },
                data: { status: 'ANNULEE' },
            });
            if (claimed.count === 0) {
                throw new BadRequestException('Cette commande ne peut plus être annulée.');
            }
            await tx.order.update({
                where: { id },
                data: { statusHistory: { create: { status: 'ANNULEE' } } },
                select: { id: true },
            });
            await tx.payment.updateMany({
                where: { orderId: id, status: 'EN_ATTENTE' },
                data: { status: 'ECHOUEE' },
            });
            await releaseStock(
                tx,
                order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            );
        });

        await this.audit.log({
            actorId: userId, action: 'ORDER_STATUS_CHANGE', entityType: 'Order', entityId: id,
            previousValue: 'EN_ATTENTE_PAIEMENT', newValue: 'ANNULEE',
        });
        return this.findOneMine(userId, id);
    }

    async findForMerchant(ownerId: number) {
        const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
        if (!shop) throw new NotFoundException("Vous n'avez pas encore de boutique.");

        // Une commande peut contenir des produits de plusieurs boutiques dans l'absolu,
        // mais le commerçant ne doit voir que ses propres lignes de commande (BR-SEC-03).
        const orders = await this.prisma.order.findMany({
            where: {
                status: { in: MERCHANT_VISIBLE_STATUSES },
                items: { some: { product: { shopId: shop.id } } },
            },
            include: {
                items: { include: { product: true }, where: { product: { shopId: shop.id } } },
                address: MERCHANT_ADDRESS_SELECT,
                user: MERCHANT_USER_SELECT,
            },
            omit: HIDE_CONFIRMATION_CODE,
            orderBy: { createdAt: 'desc' },
        });
        return orders.map(maskMerchantOrder);
    }

    async findOneForMerchant(ownerId: number, orderId: number) {
        const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
        if (!shop) throw new NotFoundException("Vous n'avez pas encore de boutique.");

        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                status: { in: MERCHANT_VISIBLE_STATUSES },
                items: { some: { product: { shopId: shop.id } } },
            },
            include: {
                items: { include: { product: true }, where: { product: { shopId: shop.id } } },
                address: MERCHANT_ADDRESS_SELECT,
                user: MERCHANT_USER_SELECT,
                statusHistory: true,
            },
            omit: HIDE_CONFIRMATION_CODE,
        });

        if (!order) throw new NotFoundException("Commande introuvable ou ne concernant pas votre boutique.");
        return maskMerchantOrder(order);
    }

    async markAsPreparing(ownerId: number, id: number) {
        const order = await this.findOneForMerchant(ownerId, id);

        if (order.status !== 'PAYEE') {
            throw new BadRequestException('Seule une commande payée peut passer en préparation.');
        }

        // La transaction ne contient que les écritures (pas de lecture avec relations) :
        // les lectures jointes dans une transaction faisaient émettre à Prisma des requêtes
        // concurrentes sur la même connexion pg (avertissement de dépréciation).
        await this.prisma.$transaction([
            this.prisma.order.update({
                where: { id: order.id },
                data: {
                    status: 'EN_PREPARATION',
                    statusHistory: { create: { status: 'EN_PREPARATION' } },
                },
                select: { id: true },
            }),
            this.prisma.delivery.create({ data: { orderId: order.id } }),
        ]);
        await this.audit.log({
            actorId: ownerId, action: 'ORDER_STATUS_CHANGE', entityType: 'Order', entityId: id,
            previousValue: 'PAYEE', newValue: 'EN_PREPARATION',
        });

        // Relecture hors transaction : seuls les articles de la boutique, sans code de confirmation
        // (BR-SEC-03, BR-LIV-04).
        return this.findOneForMerchant(ownerId, id);
    }
}
