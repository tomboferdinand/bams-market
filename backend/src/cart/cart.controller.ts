import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';

// Le panier est réservé aux comptes CLIENT (BR-USR-04, BR-SEC-03).
@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CartController {
    constructor(private readonly cartService: CartService) { }

    @Get()
    @Roles(Role.CLIENT)
    getMine(@CurrentUser() user: { id: number }) {
        return this.cartService.getMine(user.id);
    }

    @Post('items')
    @Roles(Role.CLIENT)
    addItem(@CurrentUser() user: { id: number }, @Body() dto: AddCartItemDto) {
        return this.cartService.addItem(user.id, dto.productId, dto.quantity);
    }

    @Patch('items/:productId')
    @Roles(Role.CLIENT)
    updateItem(
        @CurrentUser() user: { id: number },
        @Param('productId', ParseIntPipe) productId: number,
        @Body() dto: UpdateCartItemDto,
    ) {
        return this.cartService.updateItem(user.id, productId, dto.quantity);
    }

    @Delete('items/:productId')
    @Roles(Role.CLIENT)
    removeItem(@CurrentUser() user: { id: number }, @Param('productId', ParseIntPipe) productId: number) {
        return this.cartService.removeItem(user.id, productId);
    }

    @Delete()
    @Roles(Role.CLIENT)
    clear(@CurrentUser() user: { id: number }) {
        return this.cartService.clear(user.id);
    }
}
