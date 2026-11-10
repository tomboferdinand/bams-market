import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SimulateCallbackDto } from './dto/simulate-callback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VerifiedEmailGuard } from '../common/guards/verified-email.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(VerifiedEmailGuard)
  initiate(@CurrentUser() user: { id: number }, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.initiate(user.id, dto.orderId);
  }

  // Page de retour GoalPay : les adresses de redirection sont fixes, on retrouve donc le dernier paiement du client.
  @Get('latest')
  getLatest(@CurrentUser() user: { id: number }) {
    return this.paymentsService.getLatestForUser(user.id);
  }

  @Get('order/:orderId')
  getStatus(@CurrentUser() user: { id: number }, @Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getStatus(user.id, orderId);
  }

  @Post(':id/simulate')
  simulate(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SimulateCallbackDto,
  ) {
    return this.paymentsService.simulateCallback(user.id, id, dto.outcome);
  }

  @Get()
  @Roles(Role.ADMINISTRATEUR)
  findAll() {
    return this.paymentsService.findAllForAdmin();
  }
}
