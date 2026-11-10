import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REQUESTABLE_ROLES = ['COMMERCANT', 'LIVREUR'] as const;
export type RequestableRole = (typeof REQUESTABLE_ROLES)[number];

export class CreateRoleRequestDto {
  @IsIn(REQUESTABLE_ROLES, { message: 'Rôle demandé invalide (commerçant ou livreur).' })
  requestedRole!: RequestableRole;

  // Numéro Mobile Money où le futur partenaire recevra son argent ; sa validité est contrôlée par le service.
  @IsString()
  @MaxLength(30)
  payoutPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
