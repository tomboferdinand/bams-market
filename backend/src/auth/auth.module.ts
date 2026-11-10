import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.registerAsync({
            useFactory: () => {
                // Pas de secret de secours : sans JWT_SECRET, le serveur refuse de démarrer
                // plutôt que de signer avec une clé connue de tous.
                const secret = process.env.JWT_SECRET;
                if (!secret) {
                    throw new Error('JWT_SECRET est obligatoire (définissez-le dans backend/.env).');
                }
                return {
                    secret,
                    signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as any },
                };
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
