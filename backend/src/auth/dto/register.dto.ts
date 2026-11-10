import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { normalizeEmail, normalizePhone } from '../../common/utils/identity';

const PHONE_REGEX = /^(?:\+261|0)(?:32|33|34|38)\d{7}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

const trimEmail = ({ value }: { value: unknown }) => (typeof value === 'string' ? normalizeEmail(value) : value);
const canonPhone = ({ value }: { value: unknown }) => (typeof value === 'string' ? normalizePhone(value) : value);

export class RegisterDto {
    @IsString()
    @MinLength(2)
    firstName!: string;

    @IsString()
    @MinLength(2)
    lastName!: string;

    // E-mail ET téléphone obligatoires : l'e-mail sert à la vérification et à la récupération du compte,
    // le téléphone à la livraison et aux paiements Mobile Money.
    @Transform(trimEmail)
    @IsEmail({}, { message: "Format d'e-mail invalide." })
    email!: string;

    @Transform(canonPhone)
    @Matches(PHONE_REGEX, {
        message: 'Numéro invalide (ex: 034XXXXXXX ou +26134XXXXXXX).',
    })
    phone!: string;

    @IsString()
    @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
    @Matches(PASSWORD_REGEX, {
        message: 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre.',
    })
    password!: string;
}
