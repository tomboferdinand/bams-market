import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'accountStatus', required: false })
  @ApiQuery({ name: 'search', required: false })
  listUsers(
    @Query('role') role?: string,
    @Query('accountStatus') accountStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(role, accountStatus, search);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @CurrentUser() admin: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    return this.adminService.updateUserStatus(admin.id, id, dto.accountStatus);
  }

  @Get('orders')
  @ApiQuery({ name: 'status', required: false })
  listOrders(@Query('status') status?: string) {
    return this.adminService.listOrders(status);
  }

  @Get('orders/:id')
  getOrder(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getOrder(id);
  }

  @Post('orders/:id/refund')
  refundOrder(
    @CurrentUser() admin: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefundOrderDto,
  ) {
    return this.adminService.refundOrder(admin.id, id, dto.reference, dto.note);
  }

  @Get('audit-logs')
  @ApiQuery({ name: 'entityType', required: false })
  listAuditLogs(@Query('entityType') entityType?: string) {
    return this.adminService.listAuditLogs(entityType);
  }
}
