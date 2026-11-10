import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { normalizeEmail } from '../../common/utils/identity';

export class ForgotPasswordDto {
    @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
    @IsEmail({}, { message: "Format d'e-mail invalide." })
    email!: string;
}
