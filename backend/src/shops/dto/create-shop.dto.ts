import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { NoContactInfo } from '../../common/validators/no-contact-info';

export class CreateShopDto {
    @ApiProperty({ example: 'Épicerie Koloina' })
    @IsString() @MinLength(2)
    @NoContactInfo() // BR-SEC-06
    name!: string;

    @ApiProperty({ example: 'Vente de produits locaux frais et artisanat.' })
    @IsString() @MinLength(10)
    @NoContactInfo() // BR-SEC-06
    description!: string;

    @ApiProperty({ example: 'Lot II B 45, Ambalavao, Fianarantsoa' })
    @IsString() @MinLength(5)
    address!: string;

    @ApiProperty({ example: '0341234567' })
    @IsString() @MinLength(6)
    contactPhone!: string;

    @ApiPropertyOptional({ type: 'string', format: 'binary' })
    logo?: any;
}
