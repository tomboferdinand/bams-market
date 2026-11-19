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

  // Retraits réels : impossible de basculer sans les clés GoalPay (jeton d'accès et clé secrète de signature).
  if (env.PAYOUT_MODE === 'goalpay') {
    for (const name of ['GOALPAY_ACCESS_KEY', 'GOALPAY_WEBHOOK_SECRET']) {
      if (!env[name]?.trim()) errors.push(`${name} est obligatoire avec PAYOUT_MODE=goalpay (retraits réels).`);
    }
  }

  // Sans liste, tous les sites seraient autorisés à appeler l'API avec le cookie de session.
  const origins = parseCorsOrigins(env.CORS_ORIGIN);
  if (origins.length === 0) {
    errors.push('CORS_ORIGIN est obligatoire en production (adresse du site, ex. https://mon-site.exemple).');
  } else if (origins.some((o) => !/^https?:\/\/[^*\s/]+$/.test(o))) {
    errors.push('CORS_ORIGIN ne doit contenir que des adresses complètes (https://…), sans "*" ni chemin.');
  }

  return errors;
}

/** Liste des sites autorisés : valeurs séparées par des virgules, espaces et barre finale retirés. */
export function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => o.length > 0);
}

export function assertProductionConfig(env: Env = process.env): void {
  const errors = productionConfigErrors(env);
  if (errors.length > 0) {
    throw new Error(`Configuration de production invalide :\n- ${errors.join('\n- ')}`);
  }
}
