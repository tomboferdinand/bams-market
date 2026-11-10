import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const PHONE_REGEX = /^(\+261|0)(32|33|34|38)\d{7}$/;

export class CreateAddressDto {
    @IsString() @MinLength(2)
    label!: string;

    @IsString() @MinLength(5)
    fullAddress!: string;

    @IsString() @Matches(PHONE_REGEX, { message: 'Numéro invalide.' })
    phone!: string;

    @IsOptional() @IsBoolean()
    isDefault?: boolean;
}