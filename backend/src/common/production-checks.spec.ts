import { assertProductionConfig, productionConfigErrors } from './production-checks';

const prod = { NODE_ENV: 'production', PAYMENT_MODE: 'goalpay', PAYOUT_MODE: 'simulation' };

describe('Contrôles de configuration en production', () => {
  it("n'exige rien hors production : la simulation locale reste possible", () => {
    expect(productionConfigErrors({})).toEqual([]);
    expect(productionConfigErrors({ NODE_ENV: 'development' })).toEqual([]);
    expect(productionConfigErrors({ NODE_ENV: 'test' })).toEqual([]);
  });

  it('accepte une configuration de production complète', () => {
    expect(productionConfigErrors(prod)).toEqual([]);
    expect(() => assertProductionConfig(prod)).not.toThrow();
  });

  it('refuse de démarrer si PAYMENT_MODE est absent', () => {
    expect(() => assertProductionConfig({ ...prod, PAYMENT_MODE: undefined })).toThrow(/PAYMENT_MODE/);
  });

  it('refuse de démarrer si PAYOUT_MODE est absent', () => {
    expect(() => assertProductionConfig({ ...prod, PAYOUT_MODE: undefined })).toThrow(/PAYOUT_MODE/);
  });

  it('refuse une valeur vide ou inconnue', () => {
    expect(productionConfigErrors({ ...prod, PAYMENT_MODE: '' })).toHaveLength(1);
    expect(productionConfigErrors({ ...prod, PAYMENT_MODE: 'GoalPay' })).toHaveLength(1);
    expect(productionConfigErrors({ ...prod, PAYOUT_MODE: 'reel' })).toHaveLength(1);
  });

  it('accepte la simulation en production si elle est choisie explicitement', () => {
    expect(productionConfigErrors({ ...prod, PAYMENT_MODE: 'simulation' })).toEqual([]);
  });
});
