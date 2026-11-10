import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { getSimulatedFeePercent } from '../common/payout-config';
import { PayoutPreview, PayoutProvider, PayoutResult } from './payout-provider';

/**
 * SIMULATION — retraits fictifs : aucun argent ne bouge. Sert aux tests, au développement et à la
 * démonstration (les retraits GoalPay ne fonctionnent pas en mode test, uniquement en production).
 */
@Injectable()
export class SimulatedPayoutProvider extends PayoutProvider {
  async ensureWhitelisted(): Promise<void> {
    // rien à faire en simulation
  }

  async preview(_phone: string, amount: number): Promise<PayoutPreview> {
    return { fees: Math.round((amount * getSimulatedFeePercent()) / 100) };
  }

  async withdraw(): Promise<PayoutResult> {
    return { status: 'success', providerReference: `SIMOP-${randomBytes(6).toString('hex').toUpperCase()}` };
  }
}
