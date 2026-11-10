import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

/**
 * Webhook appelé par GoalPay (POST /api/webhook). Public : pas de JWT, l'authenticité est
 * contrôlée par la signature. C'est la seule source qui valide un paiement.
 */
@ApiExcludeController()
@Controller('webhook')
export class GoalpayWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(200)
  handle(@Headers('x-gpay-signature') signature: string | undefined, @Body() body: any) {
    return this.paymentsService.handleGoalpayWebhook(signature, body);
  }
}
