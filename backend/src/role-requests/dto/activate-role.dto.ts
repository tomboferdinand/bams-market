import { IsString, MaxLength, MinLength } from 'class-validator';

export class ActivateRoleDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  token!: string;
}
