import { IsInt, IsPositive } from 'class-validator';

export class CreatePaymentDto {
 @IsInt()
  @IsInt() @IsPositive()
  orderId!: number;
}