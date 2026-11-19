import { assertProductionConfig, parseCorsOrigins, productionConfigErrors } from './production-checks';

const prod = { NODE_ENV: 'production', PAYMENT_MODE: 'goalpay', PAYOUT_MODE: 'simulation', CORS_ORIGIN: 'https://site.exemple' };

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

  it('retraits réels : refuse de démarrer sans jeton ni clé secrète GoalPay', () => {
    const real = { ...prod, PAYOUT_MODE: 'goalpay' };
    expect(productionConfigErrors(real)).toEqual([
      'GOALPAY_ACCESS_KEY est obligatoire avec PAYOUT_MODE=goalpay (retraits réels).',
      'GOALPAY_WEBHOOK_SECRET est obligatoire avec PAYOUT_MODE=goalpay (retraits réels).',
    ]);
    expect(productionConfigErrors({ ...real, GOALPAY_ACCESS_KEY: 'k', GOALPAY_WEBHOOK_SECRET: '  ' })).toHaveLength(1);
    expect(productionConfigErrors({ ...real, GOALPAY_ACCESS_KEY: 'k', GOALPAY_WEBHOOK_SECRET: 's' })).toEqual([]);
    // Retour à la simulation : plus rien n'est exigé (une seule variable à changer).
    expect(productionConfigErrors({ ...prod, PAYOUT_MODE: 'simulation' })).toEqual([]);
  });

  it('refuse de démarrer si CORS_ORIGIN est absent ou vide', () => {
    expect(() => assertProductionConfig({ ...prod, CORS_ORIGIN: undefined })).toThrow(/CORS_ORIGIN/);
    expect(() => assertProductionConfig({ ...prod, CORS_ORIGIN: ' , ' })).toThrow(/CORS_ORIGIN/);
  });

  it('refuse le joker et les adresses incomplètes', () => {
    expect(productionConfigErrors({ ...prod, CORS_ORIGIN: '*' })).toHaveLength(1);
    expect(productionConfigErrors({ ...prod, CORS_ORIGIN: 'site.exemple' })).toHaveLength(1);
    expect(productionConfigErrors({ ...prod, CORS_ORIGIN: 'https://*.exemple' })).toHaveLength(1);
  });

  it('accepte plusieurs sites et nettoie espaces et barre finale', () => {
    expect(parseCorsOrigins(' https://a.exemple/ , https://b.exemple ')).toEqual(['https://a.exemple', 'https://b.exemple']);
    expect(productionConfigErrors({ ...prod, CORS_ORIGIN: 'https://a.exemple/, https://b.exemple' })).toEqual([]);
    expect(parseCorsOrigins(undefined)).toEqual([]);
  });
});
