import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
    constructor(private readonly prisma: PrismaService) { }

    findMine(userId: number) {
        return this.prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }

    private async findOwned(userId: number, id: number) {
        const address = await this.prisma.address.findUnique({ where: { id } });
        if (!address) throw new NotFoundException('Adresse introuvable.');
        if (address.userId !== userId) throw new ForbiddenException('Cette adresse ne vous appartient pas.');
        return address;
    }

    async create(userId: number, dto: CreateAddressDto) {
        if (dto.isDefault) {
            await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
        }
        return this.prisma.address.create({ data: { ...dto, userId } });
    }

    async update(userId: number, id: number, dto: UpdateAddressDto) {
        await this.findOwned(userId, id);
        if (dto.isDefault) {
            await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
        }
        return this.prisma.address.update({ where: { id }, data: dto });
    }

    async remove(userId: number, id: number) {
        await this.findOwned(userId, id);
        const usedInOrder = await this.prisma.order.findFirst({ where: { addressId: id } });
        if (usedInOrder) {
            throw new ForbiddenException("Impossible de supprimer une adresse utilisée par une commande existante.");
        }
        return this.prisma.address.delete({ where: { id } });
    }
}