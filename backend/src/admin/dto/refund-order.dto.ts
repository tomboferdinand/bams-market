import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Administration : enregistrer le remboursement manuel d'une commande dont la livraison a échoué.
export class RefundOrderDto {
  // Référence de la transaction Mobile Money effectuée par l'administrateur.
  @IsString()
  @MinLength(3, { message: 'Indiquez la référence de la transaction (3 caractères minimum).' })
  @MaxLength(100)
  reference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
