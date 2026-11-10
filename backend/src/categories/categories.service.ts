import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
    constructor(private readonly prisma: PrismaService) { }

    /** Public — utilisé pour les filtres du catalogue client, seulement les catégories actives. */
    findAllActive() {
        return this.prisma.category.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    /** Admin — toutes les catégories avec le nombre réel de produits liés. */
    async findAllForAdmin() {
        const categories = await this.prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { products: true } } },
        });
        return categories.map((c) => ({
            id: c.id,
            name: c.name,
            isActive: c.isActive,
            productsCount: c._count.products,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));
    }

    async create(dto: CreateCategoryDto) {
        const existing = await this.prisma.category.findUnique({ where: { name: dto.name } });
        if (existing) throw new ConflictException('Cette catégorie existe déjà.');
        return this.prisma.category.create({ data: dto });
    }

    private async assertExists(id: number) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) throw new NotFoundException('Catégorie introuvable.');
        return category;
    }

    async update(id: number, dto: UpdateCategoryDto) {
        await this.assertExists(id);
        if (dto.name) {
            const conflict = await this.prisma.category.findFirst({
                where: { name: dto.name, id: { not: id } },
            });
            if (conflict) throw new ConflictException('Ce nom de catégorie est déjà utilisé.');
        }
        return this.prisma.category.update({ where: { id }, data: dto });
    }

    async deactivate(id: number) {
        await this.assertExists(id);
        return this.prisma.category.update({ where: { id }, data: { isActive: false } });
    }

    async reactivate(id: number) {
        await this.assertExists(id);
        return this.prisma.category.update({ where: { id }, data: { isActive: true } });
    }
}