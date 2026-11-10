import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly service: UsersService) { }

    @Get()
    @Roles(Role.ADMINISTRATEUR)
    findAll() {
        return this.service.findAll();
    }

    @Patch('me')
    updateMe(@CurrentUser() user: { id: number }, @Body() dto: UpdateProfileDto) {
        return this.service.updateProfile(user.id, dto);
    }
}