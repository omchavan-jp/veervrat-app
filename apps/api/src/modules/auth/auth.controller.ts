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
import { registerThrottle } from '../../common/throttler/throttler-config.factory';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { CapabilitiesService } from '../capabilities/capabilities.service';
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
import { GoogleOAuthGuard, REAUTH_STATE } from './guards/google-oauth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentSessionId } from './decorators/current-session-id.decorator';
import { SkipCsrf } from '../../common/guards/csrf.guard';
import { authCookieOptions, clearLegacyHostOnlyCookie } from '../../common/http/cookie';
import { Audited } from '../audit/audited.decorator';
import { StartGoogleSignupDto } from './dto/start-google-signup.dto';
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
    private readonly capabilities: CapabilitiesService,
  ) {
    const ttlDays = this.configService.get<number>('SESSION_TTL_DAYS', 30);
    this.cookieName = this.configService.get<string>('SESSION_COOKIE_NAME', 'veervrat_session');
    this.cookieMaxAgeMs = ttlDays * 24 * 60 * 60 * 1000;
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  @Post('register')
  @Throttle({ default: registerThrottle() })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(
      dto.email,
      dto.password,
      dto.displayName,
      dto.username,
      dto.dob,
      dto.consents,
      dto.language,
    );
    return {
      ...result.user,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Two limits, two units, and the relationship between them is the point (#76).
  //
  //   identity  20 per (email + IP) / 15 min — looser than the 10-failure account lockout, so
  //             the lockout fires FIRST and returns ACCOUNT_LOCKED with a countdown. When both
  //             tripped at 10 the guard always won and the documented lockout was dead code.
  //   default  100 per IP / 15 min — the spray backstop. Generous enough that a school or
  //             office behind one NAT never meets it in ordinary use, tight enough that
  //             walking a password list across many addresses from one IP still stops.
  //
  // Raising `default` from 10 is safe precisely because `identity` now exists: the per-account
  // protection moved to a key that names the account, instead of being approximated by IP.
  @Throttle({
    identity: { ttl: 900000, limit: 20 },
    default: { ttl: 900000, limit: 100 },
  })
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

  /**
   * Policy documents this person still owes acceptance of.
   *
   * Its own call rather than a field on /auth/me: the session is resolved server-side on every
   * document request, so anything added there is paid on every page load.
   */
  @Get('consents/outstanding')
  @UseGuards(SessionGuard)
  async outstandingConsents(@CurrentUser() user: SessionUser) {
    return { documents: await this.authService.outstandingConsents(user.id) };
  }

  /**
   * Accepts everything currently outstanding.
   *
   * Takes no version: the server decides which versions are current, exactly as it does at
   * signup. A client able to name its own version could record acceptance of text nobody showed
   * it, which would make the consent record worse than useless — it would look like evidence.
   */
  @Post('consents/accept')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'auth.consent_accepted',
    resourceType: 'user',
    resourceId: (ctx) => (ctx.req.user as SessionUser | undefined)?.id ?? null,
  })
  async acceptConsents(@CurrentUser() user: SessionUser) {
    return { accepted: await this.authService.acceptOutstandingConsents(user.id) };
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
  //
  // ⚠️ `forgot-password` NO LONGER behaves this way, deliberately (#196), and the divergence is
  // recorded here rather than left to look like an oversight. That route now says when no account
  // exists, because the concealment was ineffective — `register()` refuses a duplicate address
  // and says so, answering the same question to anyone who asks — while costing a person who
  // mistyped their address a silent wait for mail that would never arrive.
  //
  // The same argument applies here and this route has not been changed with it. Resending a
  // verification email is not something a person does while locked out and anxious, so the cost
  // of ambiguity is lower; that is a judgement, not a principle. If it is revisited, revisit it
  // deliberately rather than for consistency's sake.
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
  async requestEmailChange(
    @Body() dto: RequestEmailChangeDto,
    @CurrentUser() user: SessionUser,
    @CurrentSessionId() sessionId: string,
  ) {
    await this.authService.requestEmailChange(
      user.id,
      sessionId,
      dto.newEmail,
      dto.currentPassword,
    );
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

  /**
   * Google SIGNUP. Collects the age gate and consent first, then hands the browser to Google.
   *
   * Deliberately separate from sign-in below. If one endpoint served both, an underage visitor
   * would reach Google, come back, and only then be turned away — by which point an account row
   * exists for someone the platform is not for.
   */
  @Post('google/signup')
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  async startGoogleSignup(@Body() dto: StartGoogleSignupDto) {
    const { pendingId } = await this.authService.startGoogleSignup(
      dto.username,
      dto.dob,
      dto.consents,
      dto.language,
    );
    // Only the opaque id is returned — never the date of birth itself. The web builds the
    // authorize URL from its own runtime config, so the API need not know its public origin.
    return { pendingId };
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleAuth() {
    // Guard handles the redirect to Google, carrying `pending` through as OAuth state when the
    // request came from the signup flow. Without it this is sign-in, which never creates.
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as unknown as GoogleProfile;

    try {
      // Google returns the `state` we sent. It holds only a pending-signup id, and its presence
      // is what distinguishes signup from sign-in.
      const state = typeof req.query.state === 'string' ? req.query.state : undefined;

      // Re-authentication (#196): an existing session proving, mid-session, that the person is
      // still the account holder. This must NOT fall through to handleGoogleLogin — that issues
      // a session for whoever signed in, so signing in as somebody else would hand over their
      // account. Nothing here creates or replaces a session; it only stamps the one already held.
      if (state === REAUTH_STATE) {
        const token = (req.cookies as Record<string, string> | undefined)?.[this.cookieName];
        const session = token ? await this.authService.validateSession(token) : null;
        if (!session) {
          res.redirect(`${this.frontendUrl}/login?notice=reauth_session_expired`);
          return;
        }

        const ok = await this.authService.reauthenticateWithGoogle(
          session.user.id,
          session.sessionId,
          profile.googleId,
        );
        // A mismatch means a DIFFERENT Google account was used. Not an error the person made in
        // the system's terms, but it proves nothing about this account, so it authorises nothing.
        res.redirect(`${this.frontendUrl}/settings?reauth=${ok ? 'ok' : 'wrong_account'}`);
        return;
      }

      const pendingSignupId = state;

      const result = await this.authService.handleGoogleLogin(
        profile,
        req.ip ?? null,
        req.headers['user-agent'] ?? null,
        pendingSignupId,
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
      const response =
        error instanceof Error
          ? (error as { response?: { error?: string; deletedAt?: string } }).response
          : undefined;
      const errorCode = response?.error ?? 'AUTH_ERROR';
      // Someone using Google sign-in without an account has not made a mistake — they simply
      // have no account yet. Sending them to /login would be a dead end, and labelling it
      // `error=` in the address bar tells them they did something wrong when the flow is working
      // exactly as designed. It gets a `notice`, not an error.
      if (errorCode === 'SIGNUP_REQUIRED') {
        res.redirect(`${this.frontendUrl}/signup?notice=google_signup_required`);
        return;
      }
      // A deleted account carries its date through, because "deleted" without "when" leaves the
      // person unable to tell their own action from somebody else's. Safe to disclose here and
      // nowhere else: a completed Google round trip has just proven they hold the identity.
      if (errorCode === 'ACCOUNT_DELETED' && response?.deletedAt) {
        const at = encodeURIComponent(response.deletedAt);
        res.redirect(`${this.frontendUrl}/login?error=ACCOUNT_DELETED&deletedAt=${at}`);
        return;
      }
      // Being under the minimum age IS a refusal, so it keeps the error framing.
      const destination = errorCode === 'UNDERAGE' ? 'signup' : 'login';
      res.redirect(`${this.frontendUrl}/${destination}?error=${errorCode}`);
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
    // One coherent set of grants, not flags from two different sources. `isContentEditor` used
    // to be computed from an env allowlist here while roles came from the database — two shapes
    // for the same question, which is the drift #40 exists to end.
    return { ...me, grants: await this.capabilities.grantsFor(me.id) };
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
