import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { GoalpayWebhookController } from './goalpay-webhook.controller';
import { PaymentsService } from './payments.service';
import { PaymentsExpirySweeper } from './payments-expiry.sweeper';
import { GoalpayClient } from './goalpay.client';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PayoutsModule } from '../payouts/payouts.module';

@Module({
  imports: [PayoutsModule],
  controllers: [PaymentsController, GoalpayWebhookController, WalletController],
  providers: [PaymentsService, PaymentsExpirySweeper, GoalpayClient, WalletService],
})
export class PaymentsModule {}
