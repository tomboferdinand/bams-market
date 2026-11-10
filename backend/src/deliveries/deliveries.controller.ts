import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.LIVREUR)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('available')
  findAvailable() {
    return this.deliveriesService.findAvailable();
  }

  @Get('mine')
  findMine(@CurrentUser() user: { id: number }) {
    return this.deliveriesService.findMine(user.id);
  }

  @Get('history')
  findHistory(@CurrentUser() user: { id: number }) {
    return this.deliveriesService.findHistory(user.id);
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.accept(user.id, id);
  }

  @Patch(':id/confirm')
  confirm(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmDeliveryDto,
  ) {
    return this.deliveriesService.confirm(user.id, id, dto.confirmationCode);
  }

  @Patch(':id/fail')
  reportFailure(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.reportFailure(user.id, id);
  }
}