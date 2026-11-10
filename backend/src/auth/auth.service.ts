import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../common/mail/mail.service';
import { AuditService } from '../common/audit/audit.service';
import { generateToken, hashToken, RESET_TTL_MS, VERIFICATION_TTL_MS } from './tokens';
import { normalizeIdentifier } from '../common/utils/identity';

const SALT_ROUNDS = 10;

const maxLoginAttempts = () => Number(process.env.AUTH_MAX_LOGIN_ATTEMPTS ?? 5);
const lockMinutes = () => Number(process.env.AUTH_LOCK_MINUTES ?? 15);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly audit: AuditService,
  ) { }

  private buildAuthResponse(user: {
    id: number;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
    role: string;
    accountStatus: string;
    verificationStatus: string;
    createdAt: Date | string;
  }) {
    const payload = { sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accountStatus: user.accountStatus,
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt,
      },
    };
  }

  /** Crée un jeton de vérification (seule son empreinte est stockée) et envoie le lien. Renvoie false si l'envoi échoue. */
  private async issueVerification(userId: number, email: string): Promise<boolean> {
    const { token, hash } = generateToken();
    await this.usersService.setVerificationToken(userId, hash, new Date(Date.now() + VERIFICATION_TTL_MS));
    return this.mailService.sendVerificationEmail(email, token);
  }

  async register(dto: RegisterDto) {
    const alreadyExists = await this.usersService.existsByEmailOrPhone(
      dto.email,
      dto.phone,
    );

    if (alreadyExists) {
      throw new ConflictException(
        'Un compte existe déjà avec cet e-mail ou ce numéro.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
    });

    // Un incident de messagerie ne doit pas faire échouer l'inscription : le lien peut être renvoyé.
    await this.issueVerification(user.id, dto.email);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailOrPhone(normalizeIdentifier(dto.identifier));

    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    // Compte verrouillé après trop d'échecs : refusé même avec le bon mot de passe.
    if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
      const minutes = Math.max(1, Math.ceil((user.loginLockedUntil.getTime() - Date.now()) / 60_000));
      throw new HttpException(
        `Trop de tentatives. Compte verrouillé, réessayez dans ${minutes} min ou réinitialisez votre mot de passe.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      await this.usersService.registerLoginFailure(user.id, maxLoginAttempts(), lockMinutes());
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    // BR-USR-05 : compte suspendu ou désactivé ne peut plus se connecter
    if (user.accountStatus !== 'ACTIF') {
      throw new ForbiddenException(
        'Ce compte est suspendu ou désactivé. Contactez le support.',
      );
    }

    if (user.loginAttempts > 0 || user.loginLockedUntil) {
      await this.usersService.resetLoginFailures(user.id);
    }

    return this.buildAuthResponse(user);
  }


  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    const matches = await bcrypt.compare(dto.currentPassword, user!.passwordHash);

    if (!matches) {
      throw new BadRequestException('Mot de passe actuel incorrect.');
    }

    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.usersService.updatePasswordHash(userId, newHash);
    return { success: true };
  }

  async verifyEmail(token: string) {
    if (typeof token !== 'string' || token.length === 0) {
      throw new BadRequestException('Lien de vérification invalide ou expiré.');
    }
    const user = await this.usersService.findByVerificationToken(hashToken(token));

    if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Lien de vérification invalide ou expiré.');
    }

    await this.usersService.markAsVerified(user.id);
    return { success: true };
  }

  async resendVerification(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user?.email) {
      throw new BadRequestException('Aucune adresse e-mail associée à ce compte.');
    }
    if (user.verificationStatus === 'VERIFIE') {
      throw new BadRequestException('Ce compte est déjà vérifié.');
    }

    const sent = await this.issueVerification(user.id, user.email);
    if (!sent) {
      throw new ServiceUnavailableException("Impossible d'envoyer l'e-mail pour le moment. Réessayez dans quelques minutes.");
    }
    return { success: true };
  }

  // ───────── Mot de passe oublié ─────────

  /** Réponse identique que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites. */
  async forgotPassword(dto: ForgotPasswordDto) {
    const generic = { success: true, message: 'Si un compte existe avec cet e-mail, un lien de réinitialisation vient d’être envoyé.' };
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.email || user.accountStatus !== 'ACTIF') return generic;

    const { token, hash } = generateToken();
    await this.usersService.setPasswordResetToken(user.id, hash, new Date(Date.now() + RESET_TTL_MS));
    await this.mailService.sendPasswordResetEmail(user.email, token);
    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByPasswordResetToken(hashToken(dto.token));
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.usersService.completePasswordReset(user.id, passwordHash);
    await this.audit.log({
      actorId: user.id,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
      previousValue: undefined,
      newValue: 'MOT_DE_PASSE_REINITIALISE',
    });
    return { success: true };
  }
}
