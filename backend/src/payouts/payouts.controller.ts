import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { CreatePayoutDto, PayoutPreviewDto } from './dto/payout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedEmailGuard } from '../common/guards/verified-email.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Chaque utilisateur n'agit que sur son propre portefeuille ; le service refuse les rôles non concernés (403).
// Retirer exige un e-mail vérifié et la confirmation par mot de passe. Le numéro de retrait n'est pas
// modifiable ici : il est enregistré à l'activation du rôle et ne change que par l'administration.
@ApiTags('payouts')
@ApiBearerAuth()
@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get('settings')
  settings(@CurrentUser() user: { id: number }) {
    return this.payouts.getSettings(user.id);
  }

  @Get()
  list(@CurrentUser() user: { id: number }) {
    return this.payouts.list(user.id);
  }

  @Post('preview')
  preview(@CurrentUser() user: { id: number }, @Body() dto: PayoutPreviewDto) {
    return this.payouts.preview(user.id, dto.amount);
  }

  @Post()
  @UseGuards(VerifiedEmailGuard)
  create(@CurrentUser() user: { id: number }, @Body() dto: CreatePayoutDto) {
    return this.payouts.create(user.id, dto.amount, dto.password);
  }
}
