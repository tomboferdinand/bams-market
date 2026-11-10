import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Ce texte est reconnu par le frontend (frontend/src/services/api.ts) pour ouvrir la fenêtre de vérification.
export const EMAIL_NOT_VERIFIED_MESSAGE = 'Vérifiez votre adresse e-mail pour effectuer cette action.';

/**
 * Réserve une action (commander, payer, retirer de l'argent) aux comptes dont l'e-mail est vérifié.
 * À placer APRÈS JwtAuthGuard, qui renseigne `request.user`.
 */
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: { verificationStatus?: string } }>().user;
    if (user?.verificationStatus !== 'VERIFIE') {
      throw new ForbiddenException(EMAIL_NOT_VERIFIED_MESSAGE);
    }
    return true;
  }
}
