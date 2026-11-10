import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentsService } from './payments.service';

/**
 * Tâche périodique : expire les paiements et commandes abandonnés pour restituer leur stock.
 * Intervalle en secondes : EXPIRY_SWEEP_SECONDS (60 par défaut ; 0 désactive la tâche).
 * Sans danger si plusieurs instances tournent : chaque expiration est « réclamée » en base.
 */
@Injectable()
export class PaymentsExpirySweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsExpirySweeper.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly payments: PaymentsService) {}

  onModuleInit() {
    const seconds = Number(process.env.EXPIRY_SWEEP_SECONDS ?? 60);
    if (!(seconds > 0)) return;
    this.timer = setInterval(() => void this.run(), seconds * 1000);
    this.timer.unref(); // ne retient jamais l'arrêt du processus
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running) return; // pas de balayages qui se chevauchent
    this.running = true;
    try {
      const { payments, orders } = await this.payments.expireOverdue();
      if (payments > 0 || orders > 0) {
        this.logger.log(`Expirations : ${payments} paiement(s), ${orders} commande(s) sans paiement.`);
      }
    } catch (error) {
      this.logger.error('Échec du balayage des expirations', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}
