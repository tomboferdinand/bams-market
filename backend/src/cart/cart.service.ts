import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { computeOrderTotals } from '../common/pricing';
import { isShopOpen } from '../common/shop-visibility';

@Injectable()
export class CartService {
    constructor(private readonly prisma: PrismaService) { }

    private async getOrCreateCart(userId: number) {
        let cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart) cart = await this.prisma.cart.create({ data: { userId } });
        return cart;
    }

    async getMine(userId: number) {
        const cart = await this.getOrCreateCart(userId);
        const items = await this.prisma.cartItem.findMany({
            where: { cartId: cart.id },
            include: { product: { include: { shop: { include: { owner: { select: { accountStatus: true } } } }, category: true } } },
        });

        // Le prix est toujours recalculé depuis le produit en direct (BR-SEC-02) : jamais stocké dans le panier.
        // Un produit n'est plus disponible si sa boutique a fermé entre-temps (boutique non validée,
        // commerçant suspendu ou désactivé) : le panier le signale, la commande le refuse.
        const enriched = items.map((item) => {
            const shopOpen = item.product.shop ? isShopOpen(item.product.shop) : true;
            return {
                id: item.id,
                productId: item.productId,
                quantity: item.quantity,
                product: item.product,
                lineTotal: item.product.price * item.quantity,
                available: item.product.isActive && shopOpen && item.product.stock >= item.quantity,
            };
        });

        const subtotal = enriched.reduce((sum, i) => sum + i.lineTotal, 0);

        // Montants officiels calculés par le serveur : sous-total, frais de livraison, total,
        // minimum de commande (mêmes règles que la création de commande).
        return { items: enriched, ...computeOrderTotals(subtotal) };
    }

    async addItem(userId: number, productId: number, quantity: number) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { shop: { select: { status: true, owner: { select: { accountStatus: true } } } } },
        });
        // Produit inactif, boutique non validée ou commerçant suspendu/désactivé : indisponible.
        if (!product || !product.isActive || !isShopOpen(product.shop)) {
            throw new NotFoundException('Produit indisponible.');
        }
        if (product.stock < quantity) throw new BadRequestException('Stock insuffisant.');

        const cart = await this.getOrCreateCart(userId);

        // BR-CMD-07 : un panier = une boutique. Le panier n'est JAMAIS vidé automatiquement :
        // on refuse (409) et le client choisit explicitement de le vider ou d'annuler.
        const otherShopItem = await this.prisma.cartItem.findFirst({
            where: { cartId: cart.id, product: { shopId: { not: product.shopId } } },
            select: { product: { select: { shop: { select: { name: true } } } } },
        });
        if (otherShopItem) {
            throw new ConflictException(
                `Votre panier contient déjà des produits de la boutique « ${otherShopItem.product.shop.name} ». ` +
                "Un panier ne peut contenir que les produits d'une seule boutique.",
            );
        }

        const existing = await this.prisma.cartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId } },
        });

        if (existing) {
            const newQuantity = existing.quantity + quantity;
            if (product.stock < newQuantity) throw new BadRequestException('Stock insuffisant.');
            await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQuantity } });
        } else {
            await this.prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
        }

        return this.getMine(userId);
    }

    async updateItem(userId: number, productId: number, quantity: number) {
        const cart = await this.getOrCreateCart(userId);
        const item = await this.prisma.cartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId } },
        });
        if (!item) throw new NotFoundException('Article introuvable dans le panier.');

        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product || product.stock < quantity) throw new BadRequestException('Stock insuffisant.');

        await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
        return this.getMine(userId);
    }

    async removeItem(userId: number, productId: number) {
        const cart = await this.getOrCreateCart(userId);
        await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
        return this.getMine(userId);
    }

    async clear(userId: number) {
        const cart = await this.getOrCreateCart(userId);
        await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        return this.getMine(userId);
    }
}
