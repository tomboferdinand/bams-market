import { IsEnum } from 'class-validator';
import { AccountStatus } from '../../../generated/prisma/client';

export class UpdateAccountStatusDto {
  @IsEnum(AccountStatus)
  accountStatus!: AccountStatus;
}