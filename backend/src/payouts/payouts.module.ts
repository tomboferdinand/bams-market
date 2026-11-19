import { Module } from '@nestjs/common';
import { PayoutsController } from './payouts.controller';
import { AdminPayoutsController } from './admin-payouts.controller';
import { PayoutsService } from './payouts.service';
import { PayoutProvider } from './payout-provider';
import { SimulatedPayoutProvider } from './simulated-payout.provider';
import { GoalpayPayoutProvider } from './goalpay-payout.provider';
import { getPayoutMode } from '../common/payout-config';
import { PayoutsStatusSweeper } from './payouts-status.sweeper';

@Module({
  controllers: [PayoutsController, AdminPayoutsController],
  providers: [
    PayoutsService,
    PayoutsStatusSweeper,
    // Le mode réel ne s'active qu'avec PAYOUT_MODE=goalpay ; revenir à la simulation = changer cette seule variable.
    { provide: PayoutProvider, useFactory: () => (getPayoutMode() === 'goalpay' ? new GoalpayPayoutProvider() : new SimulatedPayoutProvider()) },
  ],
  // PayoutProvider est exporté : l'approbation d'une demande de rôle enregistre le numéro de retrait chez le fournisseur.
  exports: [PayoutsService, PayoutProvider],
})
export class PayoutsModule {}
