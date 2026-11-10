import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { ShopsService } from '../shops/shops.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from '../../generated/prisma/client';
import { PUBLIC_SHOP_FILTER } from '../common/shop-visibility';

@Injectable()
export class ProductsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService,
        private readonly shopsService: ShopsService,
    ) { }

    private computeStatus(stock: number): ProductStatus {
        return stock === 0 ? 'RUPTURE_DE_STOCK' : 'DISPONIBLE'; // BR-PRD-03
    }

    private async assertCategoryExists(categoryId: number) {
        const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) throw new NotFoundException('Catégorie introuvable.'); // BR-PRD-01
    }

    async create(ownerId: number, dto: CreateProductDto, imageBuffer?: Buffer) {
        const shop = await this.shopsService.assertOwnedAndValidated(ownerId); // BR-PRD-01
        await this.assertCategoryExists(dto.categoryId);

        let imageUrl: string | undefined;
        if (imageBuffer) {
            imageUrl = await this.cloudinary.uploadImage(imageBuffer, 'bams-market/products');
        }

        return this.prisma.product.create({
            data: {
                name: dto.name,
                description: dto.description,
                price: dto.price,
                stock: dto.stock,
                categoryId: dto.categoryId,
                shopId: shop.id,
                imageUrl,
                status: this.computeStatus(dto.stock),
            },
             include: { category: true, shop: true },
        });
    }

    /** Vérifie que le produit appartient bien à la boutique du commerçant connecté (BR-SEC-03). */
    private async findOwnedProduct(ownerId: number, productId: number) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { shop: true },
        });

        if (!product) throw new NotFoundException('Produit introuvable.');
        if (product.shop.ownerId !== ownerId) {
            throw new ForbiddenException("Ce produit n'appartient pas à votre boutique.");
        }
        return product;
    }

    async findMine(ownerId: number) {
        const shop = await this.shopsService.findMine(ownerId);
        return this.prisma.product.findMany({
            where: { shopId: shop.id },
            include: { category: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async update(ownerId: number, productId: number, dto: UpdateProductDto, imageBuffer?: Buffer) {
        const product = await this.findOwnedProduct(ownerId, productId);

        if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);

        let imageUrl = product.imageUrl;
        if (imageBuffer) {
            imageUrl = await this.cloudinary.uploadImage(imageBuffer, 'bams-market/products');
        }

        const stock = dto.stock ?? product.stock;

        return this.prisma.product.update({
            where: { id: productId },
            data: {
                ...dto,
                imageUrl,
                status: this.computeStatus(stock), // recalculé à chaque update (BR-PRD-03)
            },
            include: { category: true, shop: true },
        });
    }

    /** Désactivation logique — jamais de suppression physique (BR-PRD-05). */
    async deactivate(ownerId: number, productId: number) {
        await this.findOwnedProduct(ownerId, productId);
        return this.prisma.product.update({
            where: { id: productId },
            data: { isActive: false },
            include: { category: true, shop: true },
        });
    }

    async reactivate(ownerId: number, productId: number) {
        await this.findOwnedProduct(ownerId, productId);
        return this.prisma.product.update({
            where: { id: productId },
            data: { isActive: true },
            include: { category: true, shop: true },
        });
    }

    /** Catalogue public — visible seulement si produit actif ET boutique ouverte : validée, propriétaire actif (BR-PRD-01, BR-BQT-04, BR-USR-05). */
    async findPublicCatalogue(search?: string, categoryId?: number) {
        return this.prisma.product.findMany({
            where: {
                isActive: true,
                shop: PUBLIC_SHOP_FILTER,
                categoryId: categoryId ?? undefined,
                name: search ? { contains: search, mode: 'insensitive' } : undefined,
            },
            include: {
                category: true,
                shop: { select: { id: true, name: true, logoUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findPublicDetail(id: number) {
        const product = await this.prisma.product.findFirst({
            where: { id, isActive: true, shop: PUBLIC_SHOP_FILTER },
            include: {
                category: true,
                // BR-SEC-06 : ni adresse ni téléphone de la boutique en public.
                shop: { select: { id: true, name: true, logoUrl: true } },
            },
        });

        if (!product) throw new NotFoundException('Produit introuvable ou indisponible.');
        return product;
    }
}