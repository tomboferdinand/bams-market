import {
    Body, Controller, Get, Param, ParseIntPipe, Patch, Post,
    Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';

@ApiTags('products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    // --- Public (catalogue) ---

    @Get()
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'categoryId', required: false })
    findCatalogue(@Query('search') search?: string, @Query('categoryId') categoryId?: string) {
        return this.productsService.findPublicCatalogue(
            search,
            categoryId ? Number(categoryId) : undefined,
        );
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findPublicDetail(id);
    }

    // --- Commerçant ---

    @Get('me/all')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.COMMERCANT)
    findMine(@CurrentUser() user: { id: number }) {
        return this.productsService.findMine(user.id);
    }

    @Post()
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.COMMERCANT)
    @UseInterceptors(FileInterceptor('image'))
    create(
        @CurrentUser() user: { id: number },
        @Body() dto: CreateProductDto,
        @UploadedFile() image?: Express.Multer.File,
    ) {
        return this.productsService.create(user.id, dto, image?.buffer);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.COMMERCANT)
    @UseInterceptors(FileInterceptor('image'))
    update(
        @CurrentUser() user: { id: number },
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProductDto,
        @UploadedFile() image?: Express.Multer.File,
    ) {
        return this.productsService.update(user.id, id, dto, image?.buffer);
    }

    @Patch(':id/deactivate')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.COMMERCANT)
    deactivate(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
        return this.productsService.deactivate(user.id, id);
    }

    @Patch(':id/reactivate')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.COMMERCANT)
    reactivate(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
        return this.productsService.reactivate(user.id, id);
    }
}