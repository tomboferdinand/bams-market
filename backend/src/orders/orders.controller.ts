import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VerifiedEmailGuard } from '../common/guards/verified-email.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @Roles(Role.CLIENT)
    @UseGuards(VerifiedEmailGuard)
    create(@CurrentUser() user: { id: number }, @Body() dto: CreateOrderDto) {
        return this.ordersService.create(user.id, dto.addressId);
    }

    @Get()
    @Roles(Role.CLIENT)
    findMine(@CurrentUser() user: { id: number }) {
        return this.ordersService.findMine(user.id);
    }

    @Get(':id')
    @Roles(Role.CLIENT)
    findOne(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
        return this.ordersService.findOneMine(user.id, id);
    }

    @Patch(':id/cancel')
    @Roles(Role.CLIENT)
    cancel(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
        return this.ordersService.cancel(user.id, id);
    }

    @Get('merchant/all')
    @Roles(Role.COMMERCANT)
    findForMerchant(@CurrentUser() user: { id: number }) {
        return this.ordersService.findForMerchant(user.id);
    }

    @Get('merchant/:id')
    @Roles(Role.COMMERCANT)
    findOneForMerchant(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
        return this.ordersService.findOneForMerchant(user.id, id);
    }

    @Patch(':id/prepare')
    @Roles(Role.COMMERCANT)
    markAsPreparing(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
        return this.ordersService.markAsPreparing(user.id, id);
    }
}
