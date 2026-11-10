import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectRoleRequestDto {
  @IsString()
  @MinLength(5, { message: 'Indiquez un motif (5 caractères minimum).' })
  @MaxLength(500)
  reason!: string;
}
