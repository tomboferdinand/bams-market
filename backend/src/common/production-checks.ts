/**
 * Contrôles faits au démarrage, uniquement en production (NODE_ENV=production).
 * Le serveur refuse de démarrer plutôt que de tourner avec un réglage dangereux choisi par défaut.
 * En local et pendant les tests, rien n'est exigé : la simulation reste le comportement par défaut.
 */
type Env = Record<string, string | undefined>;

const MODES = ['simulation', 'goalpay'];

export function productionConfigErrors(env: Env = process.env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const errors: string[] = [];

  // Sans valeur explicite, le paiement passerait en simulation : un client validerait sa commande sans payer.
  for (const name of ['PAYMENT_MODE', 'PAYOUT_MODE']) {
    if (!MODES.includes(env[name] ?? '')) {
      errors.push(`${name} doit valoir exactement "simulation" ou "goalpay" en production.`);
    }
  }

  return errors;
}

export function assertProductionConfig(env: Env = process.env): void {
  const errors = productionConfigErrors(env);
  if (errors.length > 0) {
    throw new Error(`Configuration de production invalide :\n- ${errors.join('\n- ')}`);
  }
}
