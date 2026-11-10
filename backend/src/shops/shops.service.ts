import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../common/audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopStatus } from '../../generated/prisma/client';

@Injectable()
export class ShopsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService,
        private readonly audit: AuditService,
    ) { }

    async createMine(ownerId: number, dto: CreateShopDto, logoBuffer?: Buffer) {
        const existing = await this.prisma.shop.findUnique({ where: { ownerId } });
        if (existing) {
            throw new ConflictException('Vous possédez déjà une boutique.'); // BR-BQT-02
        }

        let logoUrl: string | undefined;
        if (logoBuffer) {
            logoUrl = await this.cloudinary.uploadImage(logoBuffer, 'bams-market/shops');
        }

        return this.prisma.shop.create({
            data: { ...dto, ownerId, logoUrl },
        });
    }

    async findMine(ownerId: number) {
        const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
        if (!shop) throw new NotFoundException("Vous n'avez pas encore de boutique.");
        return shop;
    }

    async updateMine(ownerId: number, dto: UpdateShopDto, logoBuffer?: Buffer) {
        const shop = await this.findMine(ownerId);

        let logoUrl = shop.logoUrl;
        if (logoBuffer) {
            logoUrl = await this.cloudinary.uploadImage(logoBuffer, 'bams-market/shops');
        }

        return this.prisma.shop.update({
            where: { id: shop.id },
            data: { ...dto, logoUrl },
        });
    }

    async findAll(status?: ShopStatus) {
        return this.prisma.shop.findMany({
            where: status ? { status } : undefined,
            include: { owner: { select: { firstName: true, lastName: true, email: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

   

    /** Utilisé par le module Products pour vérifier qu'une boutique est VALIDÉE avant d'y rattacher un produit (BR-PRD-01). */
    async assertOwnedAndValidated(ownerId: number) {
        const shop = await this.findMine(ownerId);
        if (shop.status !== 'VALIDEE') {
            throw new ForbiddenException("Votre boutique doit être validée par un administrateur pour gérer des produits.");
        }
        return shop;
    }

    async updateStatus(id: number, status: ShopStatus, actorId: number) {
        const shop = await this.prisma.shop.findUnique({ where: { id } });
        if (!shop) throw new NotFoundException('Boutique introuvable.');
        if (shop.status === status) throw new BadRequestException('La boutique est déjà dans ce statut.');

        const updated = await this.prisma.shop.update({ where: { id }, data: { status } });
        await this.audit.log({
            actorId,
            action: 'SHOP_STATUS_CHANGE',
            entityType: 'Shop',
            entityId: id,
            previousValue: shop.status,
            newValue: status,
        });
        return updated;
    }
}