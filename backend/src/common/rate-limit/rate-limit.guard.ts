import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_KEY = 'rate_limit';
export interface RateLimitOptions {
  name: string; // nom de la route (clé du compteur)
  limit: number; // requêtes autorisées…
  windowSeconds: number; // …par fenêtre de cette durée
}

/** Limite le nombre d'appels par adresse IP sur une route sensible (anti force brute / spam d'e-mails). */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  // Compteurs en mémoire : suffisant pour une seule instance du serveur.
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (process.env.RATE_LIMIT_DISABLED === 'true') return true;
    const options = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true;

    const req = context.switchToHttp().getRequest<{ ip?: string }>();
    return this.check(`${options.name}:${req.ip ?? 'inconnu'}`, options);
  }

  /** Visible pour les tests. */
  check(key: string, options: RateLimitOptions, now = Date.now()): boolean {
    const windowMs = options.windowSeconds * 1000;
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= options.limit) {
      this.hits.set(key, recent);
      const waitSeconds = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
      throw new HttpException(
        `Trop de tentatives. Réessayez dans ${Math.ceil(waitSeconds / 60)} min.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) this.prune(now, windowMs);
    return true;
  }

  private prune(now: number, windowMs: number) {
    for (const [k, v] of this.hits) {
      if (v.every((t) => now - t >= windowMs)) this.hits.delete(k);
    }
  }
}
