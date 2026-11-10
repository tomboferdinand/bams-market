import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { normalizeEmail, normalizePhone } from '../../common/utils/identity';

const PHONE_REGEX = /^(\+261|0)(32|33|34|38)\d{7}$/;

export class UpdateProfileDto {
    @IsOptional() @IsString() @MinLength(2)
    firstName?: string;

    @IsOptional() @IsString() @MinLength(2)
    lastName?: string;

    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
    @IsEmail({}, { message: "Format d'e-mail invalide." })
    email?: string;

    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? normalizePhone(value) : value))
    @Matches(PHONE_REGEX, { message: 'Numéro invalide.' })
    phone?: string;
}
