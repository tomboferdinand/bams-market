import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleRequestsService } from './role-requests.service';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { RejectRoleRequestDto } from './dto/reject-role-request.dto';
import { ActivateRoleDto } from './dto/activate-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VerifiedEmailGuard } from '../common/guards/verified-email.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';

@ApiTags('role-requests')
@ApiBearerAuth()
@Controller('role-requests')
@UseGuards(JwtAuthGuard)
export class RoleRequestsController {
  constructor(private readonly service: RoleRequestsService) {}

  @Get('mine')
  mine(@CurrentUser() user: { id: number }) {
    return this.service.mine(user.id);
  }

  // Déposer une demande exige un e-mail vérifié (on doit pouvoir joindre le demandeur).
  @Post()
  @UseGuards(VerifiedEmailGuard)
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateRoleRequestDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(user.id, id);
  }

  @Post(':id/resend-activation')
  resend(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.resendActivation(id, { userId: user.id });
  }
}

// Sans authentification : le demandeur ouvre le lien reçu par e-mail, le jeton à usage unique fait foi.
@ApiTags('role-requests')
@Controller('role-requests')
export class RoleActivationController {
  constructor(private readonly service: RoleRequestsService) {}

  @Post('activate')
  activate(@Body() dto: ActivateRoleDto) {
    return this.service.activate(dto.token);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/role-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR)
export class AdminRoleRequestsController {
  constructor(private readonly service: RoleRequestsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.listForAdmin(status);
  }

  @Patch(':id/approve')
  approve(@CurrentUser() admin: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.approve(admin.id, id);
  }

  @Patch(':id/resend-activation')
  resend(@CurrentUser() admin: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.resendActivation(id, { adminId: admin.id });
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() admin: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRoleRequestDto,
  ) {
    return this.service.reject(admin.id, id, dto.reason);
  }
}
