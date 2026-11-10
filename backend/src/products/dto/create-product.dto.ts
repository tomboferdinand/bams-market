import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { NoContactInfo } from '../../common/validators/no-contact-info';

export class CreateProductDto {
    @ApiProperty({ example: 'Pain Artisanal Local' })
    @IsString() @MinLength(2)
    @NoContactInfo() // BR-SEC-06
    name!: string;

    @ApiProperty({ example: 'Pain frais préparé chaque matin.' })
    @IsString() @MinLength(5)
    @NoContactInfo() // BR-SEC-06
    description!: string;

    @ApiProperty({ example: 1500 })
    @Type(() => Number) @IsInt() @IsPositive() // BR-PRD-02
    price!: number;

    @ApiProperty({ example: 20 })
    @Type(() => Number) @IsInt() @Min(0) // BR-PRD-03
    stock!: number;

    @ApiProperty({ example: 1 })
    @Type(() => Number) @IsInt()
    categoryId!: number;

    @ApiPropertyOptional({ type: 'string', format: 'binary' })
    image?: any;
}
