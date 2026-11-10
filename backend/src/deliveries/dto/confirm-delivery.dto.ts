import { IsString, Length } from 'class-validator';

export class ConfirmDeliveryDto {
  @IsString() @Length(6, 6)
  confirmationCode!: string;
}