import { BadGatewayException, Injectable, Logger } from '@nestjs/common';

export interface GoalpayItem {
  label: string;
  unit_price: number;
  quantity: number;
}

export interface GoalpayCheckout {
  checkoutUrl: string;
  expiresInMinutes: number;
  orderReference: string;
}

// Adresse de base de l'API GoalPay (configurable par GOALPAY_API_URL). L'ancien domaine goalpay.pro
// disparaît en décembre 2026 : l'API est désormais sur goalpay.mg.
export const DEFAULT_GOALPAY_API_URL = 'https://api.goalpay.mg';
const CHECKOUT_PATH = '/api/payement/service'; // « payement » : orthographe de l'URL GoalPay

/** Adresse complète d'un service GoalPay à partir de l'adresse de base (une barre finale est tolérée). */
export function goalpayUrl(path: string, base = process.env.GOALPAY_API_URL): string {
  return new URL(path, base?.trim() || DEFAULT_GOALPAY_API_URL).toString();
}
const TIMEOUT_MS = 15_000;

/**
 * Client HTTP de l'API de paiement GoalPay (création d'une commande de paiement).
 * Le jeton d'accès reste côté serveur : il n'est jamais renvoyé au navigateur ni journalisé.
 */
@Injectable()
export class GoalpayClient {
  private readonly logger = new Logger(GoalpayClient.name);

  isConfigured(): boolean {
    return !!process.env.GOALPAY_ACCESS_KEY;
  }

  async createCheckout(input: {
    description: string;
    reference: string;
    amount: number;
    items: GoalpayItem[];
  }): Promise<GoalpayCheckout> {
    const url = goalpayUrl(CHECKOUT_PATH);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          description: input.description,
          access: process.env.GOALPAY_ACCESS_KEY,
          reference: input.reference,
          amount: input.amount,
          currency: 'Ar',
          metadata: input.items,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.error(`Appel GoalPay impossible : ${(err as Error).message}`);
      throw new BadGatewayException('Le service de paiement est momentanément indisponible. Réessayez dans un instant.');
    }

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* réponse non JSON : traitée ci-dessous */
    }

    const data = json?.data;
    if (!res.ok || !data || typeof data.checkout_url !== 'string' || typeof data.order_reference !== 'string') {
      this.logger.error(`Réponse GoalPay inattendue (HTTP ${res.status}) : ${String(json?.message ?? '').slice(0, 200)}`);
      throw new BadGatewayException('Le service de paiement a refusé la demande. Réessayez ou contactez le support.');
    }

    let parsed: URL;
    try {
      parsed = new URL(data.checkout_url);
    } catch {
      throw new BadGatewayException('Le service de paiement a renvoyé une adresse invalide.');
    }
    if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new BadGatewayException('Le service de paiement a renvoyé une adresse non sécurisée.');
    }

    return {
      checkoutUrl: data.checkout_url,
      expiresInMinutes: Number(data.expires_in_minutes) || 10,
      orderReference: data.order_reference,
    };
  }
}
