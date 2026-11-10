import { IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export class ChangePasswordDto {
    @IsString()
    currentPassword!: string;

    @IsString() @MinLength(8, { message: '8 caractères minimum.' })
    @Matches(PASSWORD_REGEX, { message: 'Majuscule, minuscule et chiffre requis.' })
    newPassword!: string;
}