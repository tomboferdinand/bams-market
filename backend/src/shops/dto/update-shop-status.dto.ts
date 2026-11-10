import { IsEnum } from 'class-validator';
import { ShopStatus } from '../../../generated/prisma/client';

export class UpdateShopStatusDto {
    @IsEnum(ShopStatus)
    status!: ShopStatus;
}