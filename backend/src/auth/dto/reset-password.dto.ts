import { IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export class ResetPasswordDto {
    @IsString()
    token!: string;

    @IsString()
    @MinLength(8, { message: '8 caractères minimum.' })
    @Matches(PASSWORD_REGEX, { message: 'Majuscule, minuscule et chiffre requis.' })
    newPassword!: string;
}
