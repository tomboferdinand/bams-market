import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { getPayoutMode, getPayoutStatusSweepSeconds } from '../common/payout-config';
import { PayoutsService } from './payouts.service';

/**
 * Tâche périodique de rattrapage des retraits réels : vérifie auprès de GoalPay (GET withdraw-status)
 * les retraits restés EN_ATTENTE (webhook perdu, délai dépassé...). Active seulement avec
 * PAYOUT_MODE=goalpay. Intervalle : PAYOUT_STATUS_SWEEP_SECONDS (1800 par défaut ; 0 désactive).
 * Sans danger si plusieurs instances tournent : chaque règlement est « réclamé » en base.
 */
@Injectable()
export class PayoutsStatusSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PayoutsStatusSweeper.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly payouts: PayoutsService) {}

  onModuleInit() {
    if (getPayoutMode() !== 'goalpay') return;
    const seconds = getPayoutStatusSweepSeconds();
    if (!(seconds > 0)) return;
    this.timer = setInterval(() => void this.run(), seconds * 1000);
    this.timer.unref(); // ne retient jamais l'arrêt du processus
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running) return; // pas de passages qui se chevauchent
    this.running = true;
    try {
      const { checked, settled } = await this.payouts.checkPendingPayouts();
      if (checked > 0) this.logger.log(`Rattrapage des retraits : ${checked} vérifié(s), ${settled} réglé(s).`);
    } catch (error) {
      this.logger.error('Échec du rattrapage des retraits', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}
