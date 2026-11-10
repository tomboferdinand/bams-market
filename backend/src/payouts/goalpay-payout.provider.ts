import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PayoutPreview, PayoutProvider, PayoutResult } from './payout-provider';

/**
 * Retraits GoalPay (API « liste blanche »). Branchement réel prévu au lot suivant : les formats de
 * réponse ne sont pas documentés, ils seront relevés lors d'un premier essai réel à petit montant.
 * D'ici là, PAYOUT_MODE=goalpay refuse proprement les retraits plutôt que d'envoyer de l'argent à l'aveugle.
 */
@Injectable()
export class GoalpayPayoutProvider extends PayoutProvider {
  private unavailable(): never {
    throw new ServiceUnavailableException("Les retraits GoalPay ne sont pas encore activés.");
  }

  async ensureWhitelisted(): Promise<void> {
    this.unavailable();
  }

  async preview(): Promise<PayoutPreview> {
    return this.unavailable();
  }

  async withdraw(): Promise<PayoutResult> {
    return this.unavailable();
  }
}
