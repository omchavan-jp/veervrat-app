import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { SessionGuard } from './guards/session.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { SessionUser, GoogleProfile } from './types/auth.types';

@Controller('auth')
export class AuthController {
  private readonly cookieName: string;
  private readonly cookieMaxAgeMs: number;
  private readonly isProduction: boolean;
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const ttlDays = this.configService.get<number>('SESSION_TTL_DAYS', 30);
    this.cookieName = this.configService.get<string>('SESSION_COOKIE_NAME', 'veervrat_session');
    this.cookieMaxAgeMs = ttlDays * 24 * 60 * 60 * 1000;
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto.email, dto.password, dto.name ?? null);
    return {
      ...result.user,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto.email,
      dto.password,
      req.ip ?? null,
      req.headers['user-agent'] ?? null,
    );

    this.setSessionCookie(res, result.sessionToken);
    return result.user;
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[this.cookieName] as string | undefined;
    if (token) {
      await this.authService.logout(token);
    }
    this.clearSessionCookie(res);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(dto.token);
    return {
      ...result.user,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleAuth() {
    // Guard handles redirect to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as unknown as GoogleProfile;

    try {
      const result = await this.authService.handleGoogleLogin(
        profile,
        req.ip ?? null,
        req.headers['user-agent'] ?? null,
      );

      this.setSessionCookie(res, result.sessionToken);

      const redirectPath = result.user.onboardingCompletedAt ? '/dashboard' : '/onboarding';
      res.redirect(`${this.frontendUrl}${redirectPath}`);
    } catch (error) {
      const errorCode =
        error instanceof Error
          ? ((error as { response?: { error?: string } }).response?.error ?? 'AUTH_ERROR')
          : 'AUTH_ERROR';
      res.redirect(`${this.frontendUrl}/login?error=${errorCode}`);
    }
  }

  @Post('complete-onboarding')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(
    @Body() dto: CompleteOnboardingDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.authService.completeOnboarding(user.id, dto.name);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: SessionUser) {
    return this.authService.getCurrentUser(user.id);
  }

  private setSessionCookie(res: Response, token: string): void {
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: this.cookieMaxAgeMs,
      path: '/',
    });
  }

  private clearSessionCookie(res: Response): void {
    res.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
