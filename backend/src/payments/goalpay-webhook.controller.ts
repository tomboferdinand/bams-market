import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PayoutsService, isWithdrawalWebhook } from '../payouts/payouts.service';

/**
 * Webhook appelé par GoalPay (POST /api/webhook). Public : pas de JWT, l'authenticité est
 * contrôlée par la signature. C'est la seule source qui valide un paiement.
 * La même adresse reçoit les notifications de retrait (webhook_type « withdrawal.service »).
 */
@ApiExcludeController()
@Controller('webhook')
export class GoalpayWebhookController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly payoutsService: PayoutsService,
  ) {}

  @Post()
  @HttpCode(200)
  handle(@Headers('x-gpay-signature') signature: string | undefined, @Body() body: any) {
    if (isWithdrawalWebhook(body)) return this.payoutsService.handleGoalpayWebhook(signature, body);
    return this.paymentsService.handleGoalpayWebhook(signature, body);
  }
}
