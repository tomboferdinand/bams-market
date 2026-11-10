import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MailService } from '../common/mail/mail.service';
import { generateToken, VERIFICATION_TTL_MS } from '../auth/tokens';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mail: MailService,
    ) { }

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                role: true,
                accountStatus: true,
                verificationStatus: true,
                createdAt: true,
                // passwordHash volontairement exclu
            },
        });
    }

    async findById(id: number) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    /** L'identifiant doit déjà être normalisé (e-mail en minuscules ou téléphone 03XXXXXXXX). */
    async findByEmailOrPhone(identifier: string) {
        const phoneForms = /^03\d{8}$/.test(identifier)
            ? [identifier, `+261${identifier.slice(1)}`, `261${identifier.slice(1)}`] // anciens comptes non normalisés
            : [identifier];
        return this.prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { phone: { in: phoneForms } }],
            },
        });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findFirst({ where: { email } });
    }

    async existsByEmailOrPhone(email?: string, phone?: string) {
        if (!email && !phone) return false;

        const count = await this.prisma.user.count({
            where: {
                OR: [
                    email ? { email } : undefined,
                    phone ? { phone } : undefined,
                ].filter(Boolean) as Prisma.UserWhereInput[],
            },
        });

        return count > 0;
    }

    async create(data: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        passwordHash: string;
    }) {
        return this.prisma.user.create({ data });
    }


    async updateProfile(id: number, dto: UpdateProfileDto) {
        if (dto.email || dto.phone) {
            const conflict = await this.prisma.user.findFirst({
                where: {
                    id: { not: id },
                    OR: [
                        dto.email ? { email: dto.email } : undefined,
                        dto.phone ? { phone: dto.phone } : undefined,
                    ].filter(Boolean) as Prisma.UserWhereInput[],
                },
            });
            if (conflict) {
                throw new ConflictException('Cet e-mail ou ce numéro est déjà utilisé par un autre compte.');
            }
        }

        // Un nouvel e-mail n'est pas prouvé : le compte repasse « non vérifié » et un lien est envoyé.
        let verification: { token: string; data: Prisma.UserUpdateInput } | null = null;
        if (dto.email) {
            const current = await this.prisma.user.findUnique({ where: { id }, select: { email: true } });
            if (current?.email !== dto.email) {
                const { token, hash } = generateToken();
                verification = {
                    token,
                    data: {
                        verificationStatus: 'NON_VERIFIE',
                        verificationToken: hash,
                        verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
                    },
                };
            }
        }

        const updated = await this.prisma.user.update({
            where: { id },
            data: { ...dto, ...(verification?.data ?? {}) },
            select: {
                id: true, email: true, phone: true, firstName: true, lastName: true,
                role: true, accountStatus: true, verificationStatus: true, createdAt: true,
            },
        });

        if (verification && dto.email) {
            await this.mail.sendVerificationEmail(dto.email, verification.token);
        }
        return updated;
    }

    async updatePasswordHash(id: number, passwordHash: string) {
        await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    }

    /** `tokenHash` : empreinte SHA-256 du jeton envoyé par e-mail (jamais le jeton lui-même). */
    async setVerificationToken(id: number, tokenHash: string, expiresAt: Date) {
        await this.prisma.user.update({
            where: { id },
            data: { verificationToken: tokenHash, verificationTokenExpiresAt: expiresAt },
        });
    }

    async findByVerificationToken(tokenHash: string) {
        return this.prisma.user.findUnique({ where: { verificationToken: tokenHash } });
    }

    async markAsVerified(id: number) {
        await this.prisma.user.update({
            where: { id },
            data: {
                verificationStatus: 'VERIFIE',
                verificationToken: null,
                verificationTokenExpiresAt: null,
            },
        });
    }

    // ───────── Mot de passe oublié ─────────

    async setPasswordResetToken(id: number, tokenHash: string, expiresAt: Date) {
        await this.prisma.user.update({
            where: { id },
            data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
        });
    }

    async findByPasswordResetToken(tokenHash: string) {
        return this.prisma.user.findUnique({ where: { passwordResetTokenHash: tokenHash } });
    }

    /** Nouveau mot de passe : le jeton est consommé, le verrouillage levé, et l'e-mail (qui a reçu le lien) est vérifié. */
    async completePasswordReset(id: number, passwordHash: string) {
        await this.prisma.user.update({
            where: { id },
            data: {
                passwordHash,
                passwordResetTokenHash: null,
                passwordResetExpiresAt: null,
                loginAttempts: 0,
                loginLockedUntil: null,
                verificationStatus: 'VERIFIE',
                verificationToken: null,
                verificationTokenExpiresAt: null,
            },
        });
    }

    // ───────── Verrouillage après échecs de connexion ─────────

    /** Compte un échec ; au-delà de `maxAttempts`, verrouille le compte `lockMinutes` minutes. Renvoie true si verrouillé. */
    async registerLoginFailure(id: number, maxAttempts: number, lockMinutes: number): Promise<boolean> {
        const { loginAttempts } = await this.prisma.user.update({
            where: { id },
            data: { loginAttempts: { increment: 1 } },
            select: { loginAttempts: true },
        });
        if (loginAttempts >= maxAttempts) {
            await this.prisma.user.update({
                where: { id },
                data: { loginAttempts: 0, loginLockedUntil: new Date(Date.now() + lockMinutes * 60_000) },
            });
            return true;
        }
        return false;
    }

    async resetLoginFailures(id: number) {
        await this.prisma.user.update({ where: { id }, data: { loginAttempts: 0, loginLockedUntil: null } });
    }
}
