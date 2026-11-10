import {
    Body, Controller, Get, Param, ParseIntPipe, Patch, Post,
    Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, ShopStatus } from '../../generated/prisma/client';

@ApiTags('shops')
@ApiBearerAuth()
@Controller('shops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopsController {
    constructor(private readonly shopsService: ShopsService) { }

    @Post()
    @Roles(Role.COMMERCANT)
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('logo'))
    create(
        @CurrentUser() user: { id: number },
        @Body() dto: CreateShopDto,
        @UploadedFile() logo?: Express.Multer.File,
    ) {
        return this.shopsService.createMine(user.id, dto, logo?.buffer);
    }

    @Get('me')
    @Roles(Role.COMMERCANT)
    findMine(@CurrentUser() user: { id: number }) {
        return this.shopsService.findMine(user.id);
    }

    @Patch('me')
    @Roles(Role.COMMERCANT)
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('logo'))
    updateMine(
        @CurrentUser() user: { id: number },
        @Body() dto: UpdateShopDto,
        @UploadedFile() logo?: Express.Multer.File,
    ) {
        return this.shopsService.updateMine(user.id, dto, logo?.buffer);
    }

    @Get()
    @Roles(Role.ADMINISTRATEUR)
    @ApiQuery({ name: 'status', required: false, enum: ShopStatus })
    findAll(@Query('status') status?: ShopStatus) {
        return this.shopsService.findAll(status);
    }

    @Patch(':id/status')
    @Roles(Role.ADMINISTRATEUR)
    updateStatus(
        @CurrentUser() user: { id: number },
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateShopStatusDto,
   ) {
   return this.shopsService.updateStatus(id, dto.status, user.id);
   }
}
