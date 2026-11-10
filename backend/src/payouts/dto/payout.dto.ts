import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class PayoutPreviewDto {
  @IsInt()
  @Min(1)
  amount!: number;
}

export class CreatePayoutDto {
  @IsInt()
  @Min(1)
  amount!: number;

  // Confirmation : le titulaire ressaisit son mot de passe (vérifié par le service).
  @IsString()
  @MinLength(1, { message: 'Saisissez votre mot de passe pour confirmer le retrait.' })
  @MaxLength(128)
  password!: string;
}

// Administration : changer le numéro de retrait d'un commerçant ou d'un livreur.
export class AdminSetPayoutPhoneDto {
  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(5, { message: 'Indiquez le motif (5 caractères minimum).' })
  @MaxLength(300)
  reason!: string;
}
