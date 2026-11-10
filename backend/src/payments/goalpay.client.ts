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

const DEFAULT_URL = 'https://api.goalpay.pro/api/payement/service'; // « payement » : orthographe de l'URL GoalPay
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
    const url = process.env.GOALPAY_API_URL || DEFAULT_URL;

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
