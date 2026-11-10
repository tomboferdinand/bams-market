import { computeCommission, DEFAULT_COMMISSION_PERCENT, getCommissionPercent } from './commission';

describe('commission', () => {
  const original = process.env.COMMISSION_PERCENT;
  afterEach(() => {
    if (original === undefined) delete process.env.COMMISSION_PERCENT;
    else process.env.COMMISSION_PERCENT = original;
  });

  it('vaut 10 % par défaut', () => {
    delete process.env.COMMISSION_PERCENT;
    expect(getCommissionPercent()).toBe(DEFAULT_COMMISSION_PERCENT);
    expect(computeCommission(10000)).toEqual({ commissionPercent: 10, commissionAmount: 1000, merchantAmount: 9000 });
  });

  it('est configurable par COMMISSION_PERCENT', () => {
    process.env.COMMISSION_PERCENT = '8';
    expect(computeCommission(10000)).toEqual({ commissionPercent: 8, commissionAmount: 800, merchantAmount: 9200 });
  });

  it('arrondit à l’ariary entier et la somme reste exacte', () => {
    process.env.COMMISSION_PERCENT = '8.5';
    const c = computeCommission(3333);
    expect(c.commissionAmount).toBe(Math.round(3333 * 0.085));
    expect(c.commissionAmount + c.merchantAmount).toBe(3333);
  });

  it('accepte 0 % (pas de commission)', () => {
    process.env.COMMISSION_PERCENT = '0';
    expect(computeCommission(5000)).toEqual({ commissionPercent: 0, commissionAmount: 0, merchantAmount: 5000 });
  });

  it('ignore une valeur invalide et garde la valeur par défaut', () => {
    for (const bad of ['abc', '-5', '150', '']) {
      process.env.COMMISSION_PERCENT = bad;
      expect(getCommissionPercent()).toBe(DEFAULT_COMMISSION_PERCENT);
    }
  });
});
