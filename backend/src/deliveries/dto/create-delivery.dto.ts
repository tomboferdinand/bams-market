import { IsString } from 'class-validator'; export class CreateDeliveryDto { @IsString() orderId!: string; }
