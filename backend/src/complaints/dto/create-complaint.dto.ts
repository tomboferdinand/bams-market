import { IsString } from 'class-validator'; export class CreateComplaintDto { @IsString() orderId!: string; @IsString() message!: string; }
