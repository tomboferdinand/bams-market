import { IsInt, IsPositive } from 'class-validator';

export class AddCartItemDto {
    @IsInt() @IsPositive()
    productId!: number;

    @IsInt() @IsPositive()
    quantity!: number;
}