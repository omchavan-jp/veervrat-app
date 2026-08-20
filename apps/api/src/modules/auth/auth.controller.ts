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
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { RequestEmailChangeDto, ConfirmEmailChangeDto } from './dto/email-change.dto';
import { SessionGuard } from './guards/session.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { SkipCsrf } from '../../common/guards/csrf.guard';
import { authCookieOptions, clearLegacyHostOnlyCookie } from '../../common/http/cookie';
import { Audited } from '../audit/audited.decorator';
import { LinkGoogleDto } from './dto/link-google.dto';
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
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(
      dto.email,
      dto.password,
      dto.displayName,
      dto.username,
      dto.language,
    );
    return {
      ...result.user,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 900000, limit: 10 } })
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
  @Audited({
    action: 'auth.logout',
    resourceType: 'user',
    resourceId: (ctx) => (ctx.req.user as SessionUser | undefined)?.id ?? null,
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[this.cookieName] as string | undefined;
    if (token) {
      await this.authService.logout(token);
    }
    this.clearSessionCookie(res);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @Audited({
    action: 'auth.password_reset_request',
    metadata: (ctx) => ({ email: (ctx.body as { email?: string })?.email }),
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const status = await this.authService.forgotPassword(dto.email);
    return { status };
  }

  // Same throttle as forgot-password, and for a stronger reason: this sends mail to an address
  // the caller chooses, so an unlimited version is a way to bombard someone else's inbox.
  //
  // The response is deliberately identical for every input — see AuthService.resendVerification.
  // Do not add an early return or a distinct message for "unknown address"; that reintroduces
  // account enumeration.
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @Audited({
    action: 'auth.verification_resend_request',
    metadata: (ctx) => ({ email: (ctx.body as { email?: string })?.email }),
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    const status = await this.authService.resendVerification(dto.email);
    return { status };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @Audited({ action: 'auth.password_change', resourceType: 'user' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  @Post('verify-email')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(dto.token);
    return {
      ...result.user,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  @Post('request-email-change')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'auth.email_change_requested',
    resourceType: 'user',
    resourceId: (c) => (c.req.user as SessionUser)?.id,
  })
  async requestEmailChange(@Body() dto: RequestEmailChangeDto, @CurrentUser() user: SessionUser) {
    await this.authService.requestEmailChange(user.id, dto.newEmail, dto.currentPassword);
    return { message: 'A confirmation link has been sent to the new email address.' };
  }

  @Post('confirm-email-change')
  @SkipCsrf() // called from an email link (no session, no CSRF token) — same as verify-email/link-google
  @HttpCode(HttpStatus.OK)
  @Audited({ action: 'auth.email_change_confirmed', resourceType: 'user' })
  async confirmEmailChange(@Body() dto: ConfirmEmailChangeDto) {
    const result = await this.authService.confirmEmailChange(dto.token);
    return { ...result.user, message: 'Your email address has been updated.' };
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

      if ('action' in result && result.action === 'link_pending') {
        res.redirect(`${this.frontendUrl}/link-account?token=${result.token}`);
        return;
      }

      const authResult = result as import('./types/auth.types').AuthResult;
      this.setSessionCookie(res, authResult.sessionToken);
      const redirectPath = authResult.user.onboardingCompletedAt ? '/dashboard' : '/onboarding';
      res.redirect(`${this.frontendUrl}${redirectPath}`);
    } catch (error) {
      const errorCode =
        error instanceof Error
          ? ((error as { response?: { error?: string } }).response?.error ?? 'AUTH_ERROR')
          : 'AUTH_ERROR';
      res.redirect(`${this.frontendUrl}/login?error=${errorCode}`);
    }
  }

  @Post('link-google')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  async linkGoogle(
    @Body() dto: LinkGoogleDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.linkGoogleAccount(
      dto.token,
      dto.password,
      req.ip ?? null,
      req.headers['user-agent'] ?? null,
    );
    this.setSessionCookie(res, result.sessionToken);
    return result.user;
  }

  @Post('complete-onboarding')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(@Body() dto: CompleteOnboardingDto, @CurrentUser() user: SessionUser) {
    return this.authService.completeOnboarding(
      user.id,
      dto.displayName,
      dto.username,
      dto.language,
      dto.gender,
      dto.dob,
    );
  }

  @Post('complete-framework')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async completeFramework(@CurrentUser() user: SessionUser) {
    return this.authService.completeFramework(user.id);
  }

  @Get('check-username')
  async checkUsername(@Query('username') username: string) {
    if (!username) {
      return { available: false, reason: 'invalid' };
    }
    return this.authService.checkUsernameAvailability(username);
  }

  @Get('csrf')
  csrf(@Res({ passthrough: true }) res: Response) {
    // CsrfMiddleware sets the csrf-token cookie and stashes the token on
    // res.locals. We also return it in the body so a web app on a different
    // origin (which can't read the api-domain cookie) can echo it back in the
    // x-csrf-token header for the double-submit check.
    return { csrfToken: res.locals.csrfToken as string };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: SessionUser) {
    const me = await this.authService.getCurrentUser(user.id);
    return { ...me, isContentEditor: this.authService.isContentEditor(me.id) };
  }

  private setSessionCookie(res: Response, token: string): void {
    // Remove any pre-scope-change cookie first, or the browser holds two of the same name and
    // sends both — the state that made logout itself return 401 on UAT.
    clearLegacyHostOnlyCookie(res, this.cookieName);
    res.cookie(
      this.cookieName,
      token,
      authCookieOptions({ httpOnly: true, maxAgeMs: this.cookieMaxAgeMs }),
    );
  }

  private clearSessionCookie(res: Response): void {
    // Must match how it was SET, domain included — a cookie cleared with a different scope is
    // not cleared at all, and the user stays signed in.
    res.clearCookie(this.cookieName, authCookieOptions({ httpOnly: true }));
    clearLegacyHostOnlyCookie(res, this.cookieName);
  }
}
