import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { AdminSetPayoutPhoneDto } from './dto/payout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR)
export class AdminPayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get()
  findAll() {
    return this.payouts.listAll();
  }

  /** Seule voie pour changer le numéro de retrait d'un commerçant ou d'un livreur (motif obligatoire, audité). */
  @Patch('users/:userId/phone')
  setPhone(
    @CurrentUser() admin: { id: number },
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AdminSetPayoutPhoneDto,
  ) {
    return this.payouts.adminSetPayoutPhone(admin.id, userId, dto.phone, dto.reason);
  }
}
