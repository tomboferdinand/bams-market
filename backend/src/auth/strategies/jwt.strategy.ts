import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

const cookieExtractor = (req: Request): string | null => {
    return req?.cookies?.['bams_token'] ?? null;
};

// Pas de secret de secours : sans JWT_SECRET, le serveur refuse de démarrer.
function jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET est obligatoire (définissez-le dans backend/.env).');
    return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly usersService: UsersService) {
        super({
            jwtFromRequest: cookieExtractor,
            ignoreExpiration: false,
            secretOrKey: jwtSecret(),
        });
    }

    async validate(payload: { sub: number; role: string }) {
        const user = await this.usersService.findById(payload.sub);

        if (!user || user.accountStatus !== 'ACTIF') {
            throw new UnauthorizedException('Session invalide.');
        }

        // Jamais de secrets (mot de passe, jetons, compteurs de sécurité) dans l'utilisateur de la requête :
        // il est renvoyé tel quel par GET /auth/me.
        const {
            passwordHash, verificationToken, verificationTokenExpiresAt,
            passwordResetTokenHash, passwordResetExpiresAt,
            payoutAuthAttempts, payoutAuthLockedUntil,
            loginAttempts, loginLockedUntil,
            ...safeUser
        } = user;
        return safeUser;
    }
}
