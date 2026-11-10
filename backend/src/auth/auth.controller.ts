import { Body, Controller, Get, HttpCode, Patch, Post, Res, UseGuards, Query } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RateLimit, RateLimitGuard } from '../common/rate-limit/rate-limit.guard';


const COOKIE_NAME = 'bams_token';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 1 jour, aligné sur JWT_EXPIRES_IN

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  private setAuthCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  @Post('register')
  @RateLimit({ name: 'register', limit: 10, windowSeconds: 3600 })
  @UseGuards(RateLimitGuard)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(200)
  @RateLimit({ name: 'login', limit: 20, windowSeconds: 900 })
  @UseGuards(RateLimitGuard)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return user;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: { id: number }, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  @Get('verify-email')
  @RateLimit({ name: 'verify-email', limit: 30, windowSeconds: 600 })
  @UseGuards(RateLimitGuard)
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiBearerAuth()
  @RateLimit({ name: 'resend-verification', limit: 5, windowSeconds: 600 })
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  resendVerification(@CurrentUser() user: { id: number }) {
    return this.authService.resendVerification(user.id);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @RateLimit({ name: 'forgot-password', limit: 5, windowSeconds: 3600 })
  @UseGuards(RateLimitGuard)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @RateLimit({ name: 'reset-password', limit: 10, windowSeconds: 3600 })
  @UseGuards(RateLimitGuard)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
