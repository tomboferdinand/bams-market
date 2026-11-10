import { IsInt, IsPositive } from 'class-validator';

export class CreateOrderDto {
    @IsInt() @IsPositive()
    addressId!: number;
}