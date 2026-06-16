import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthProvider, Role, VerificationType } from '@prisma/client';
import type Redis from 'ioredis';
import { AuthRepository } from './auth.repository';
import {
  DuplicateEntityException,
  InvalidCredentialsException,
  EmailNotVerifiedException,
  TokenExpiredException,
  TokenInvalidException,
  EntityNotFoundException,
  AccountLockedException,
} from '../../common/exceptions/app.exceptions';
import { REDIS_CLIENT } from '../../common/redis/redis.provider';
import { SessionUser, AuthResult, LinkPendingResult, GoogleProfile, CreateSessionParams } from './types/auth.types';
import { EmailService } from '../email/email.service';
import { UsersIndexService } from '../search/users-index.service';
import { AuditService } from '../audit/audit.service';
import { VerifyEmailEmail, getSubject as getVerifySubject } from '../email/templates/VerifyEmailEmail';
import { PasswordResetEmail, getSubject as getResetSubject } from '../email/templates/PasswordResetEmail';
import { createElement } from 'react';

const BCRYPT_ROUNDS = 12;
const TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;
const GOOGLE_LINK_TOKEN_EXPIRY_MINUTES = 15;
const LOCKOUT_MAX_FAILURES = 10;
const LOCKOUT_WINDOW_SECONDS = 3600;
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const LOCKOUT_DURATION_SECONDS = 900;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly sessionTtlDays: number;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly usersIndex: UsersIndexService,
    private readonly auditService: AuditService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.sessionTtlDays = this.configService.get<number>('SESSION_TTL_DAYS', 30);
  }

  async register(
    email: string,
    password: string,
    displayName: string,
    username: string,
    language?: string,
  ): Promise<{ user: SessionUser }> {
    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new DuplicateEntityException('User', 'email');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await this.authRepository.createUserWithEmailAccount({
      email,
      displayName,
      username,
      passwordHash,
      language: language as 'EN' | 'MR' | undefined,
    });

    const verificationToken = this.generateToken();
    await this.authRepository.createVerificationToken({
      userId: user.id,
      token: verificationToken,
      type: VerificationType.EMAIL_VERIFICATION,
      expiresAt: this.hoursFromNow(VERIFICATION_TOKEN_EXPIRY_HOURS),
    });

    const verifyUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${verificationToken}`;
    const lang = (language as 'EN' | 'MR' | undefined) ?? 'EN';
    const { html: verifyHtml, text: verifyText } = await this.emailService.renderTemplate(
      createElement(VerifyEmailEmail, { displayName, verifyUrl, language: lang }),
    );
    await this.emailService.sendTransactional(email, getVerifySubject(lang), verifyHtml, verifyText);

    return { user: this.toSessionUser(user) };
  }

  async login(
    email: string,
    password: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<AuthResult> {
    const lockout = await this.checkLockout(email);
    if (lockout.locked) {
      this.auditService.record({ action: 'auth.account_lockout', metadata: { email, duration_minutes: LOCKOUT_DURATION_SECONDS / 60 }, ipAddress, userAgent });
      throw new AccountLockedException(lockout.secondsRemaining);
    }

    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      await this.recordFailedLogin(email, ipAddress, userAgent, 'no_account');
      throw new InvalidCredentialsException();
    }

    const emailAccount = await this.authRepository.findEmailAccountByUserId(user.id);
    if (!emailAccount?.passwordHash) {
      await this.recordFailedLogin(email, ipAddress, userAgent, 'no_password');
      throw new InvalidCredentialsException();
    }

    const passwordValid = await bcrypt.compare(password, emailAccount.passwordHash);
    if (!passwordValid) {
      await this.recordFailedLogin(email, ipAddress, userAgent, 'bad_password');
      throw new InvalidCredentialsException();
    }

    if (!user.emailVerifiedAt) {
      throw new EmailNotVerifiedException();
    }

    await this.clearLockout(email);

    const sessionToken = await this.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      ttlDays: this.sessionTtlDays,
    });

    this.auditService.record({ actorId: user.id, action: 'auth.login_success', resourceType: 'user', resourceId: user.id, metadata: { method: 'credentials' }, ipAddress, userAgent });

    return { user: this.toSessionUser(user), sessionToken };
  }

  async handleGoogleLogin(
    profile: GoogleProfile,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<AuthResult | LinkPendingResult> {
    const existingAccount = await this.authRepository.findAuthAccount(
      AuthProvider.GOOGLE,
      profile.googleId,
    );

    if (existingAccount) {
      const sessionToken = await this.createSession({
        userId: existingAccount.userId,
        ipAddress,
        userAgent,
        ttlDays: this.sessionTtlDays,
      });
      return {
        user: this.toSessionUser(existingAccount.user),
        sessionToken,
      };
    }

    const existingUser = await this.authRepository.findUserByEmail(profile.email);
    if (existingUser) {
      // Existing credentials account — issue a short-lived link token instead of erroring.
      // The frontend /link-account page will prompt for the password to confirm ownership.
      await this.authRepository.invalidateTokensByUserAndType(existingUser.id, VerificationType.GOOGLE_LINK);
      const linkToken = this.generateToken();
      await this.authRepository.createVerificationToken({
        userId: existingUser.id,
        token: linkToken,
        type: VerificationType.GOOGLE_LINK,
        expiresAt: this.minutesFromNow(GOOGLE_LINK_TOKEN_EXPIRY_MINUTES),
        metadata: {
          googleId: profile.googleId,
          googleEmail: profile.email,
          displayName: profile.name ?? null,
        },
      });
      return { action: 'link_pending', token: linkToken };
    }

    // Derive a clean username from the email local part:
    // dots/hyphens → underscores, strip everything else, clamp to 28 chars.
    // Try the clean name first; if taken, append an incrementing number.
    const username = await this.generateUsername(profile.email);

    const user = await this.authRepository.createUserWithOAuthAccount({
      email: profile.email,
      displayName: profile.name ?? profile.email.split('@')[0],
      username,
      provider: AuthProvider.GOOGLE,
      providerAccountId: profile.googleId,
      emailVerifiedAt: new Date(),
    });

    const sessionToken = await this.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      ttlDays: this.sessionTtlDays,
    });

    return { user: this.toSessionUser(user), sessionToken };
  }

  async linkGoogleAccount(
    token: string,
    password: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<AuthResult> {
    const verificationToken = await this.authRepository.findVerificationToken(
      token,
      VerificationType.GOOGLE_LINK,
    );
    if (!verificationToken) {
      throw new TokenInvalidException();
    }

    const emailAccount = await this.authRepository.findEmailAccountByUserId(verificationToken.userId);
    if (!emailAccount?.passwordHash) {
      throw new InvalidCredentialsException();
    }

    const passwordValid = await bcrypt.compare(password, emailAccount.passwordHash);
    if (!passwordValid) {
      throw new InvalidCredentialsException();
    }

    // Validate metadata at runtime — Prisma returns Json? as unknown, cast gives no runtime safety
    const raw = verificationToken.metadata;
    if (
      raw === null ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      typeof (raw as Record<string, unknown>)['googleId'] !== 'string' ||
      !(raw as Record<string, unknown>)['googleId']
    ) {
      throw new TokenInvalidException();
    }
    const metadata = raw as { googleId: string; googleEmail: string; displayName: string | null };

    await this.authRepository.addAuthAccount({
      userId: verificationToken.userId,
      provider: AuthProvider.GOOGLE,
      providerAccountId: metadata.googleId,
    });

    await this.authRepository.markTokenUsed(verificationToken.id);

    const sessionToken = await this.createSession({
      userId: verificationToken.userId,
      ipAddress,
      userAgent,
      ttlDays: this.sessionTtlDays,
    });

    return { user: this.toSessionUser(verificationToken.user), sessionToken };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.authRepository.deleteSession(sessionToken);
  }

  async verifyEmail(token: string): Promise<{ user: SessionUser }> {
    const verificationToken = await this.authRepository.findVerificationToken(
      token,
      VerificationType.EMAIL_VERIFICATION,
    );

    if (!verificationToken) {
      throw new TokenInvalidException();
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new TokenExpiredException('email verification');
    }

    await this.authRepository.markTokenUsed(verificationToken.id);
    const user = await this.authRepository.markEmailVerified(verificationToken.userId);

    return { user: this.toSessionUser(user) };
  }

  // Always resolves to 'sent' regardless of whether the email exists or is Google-only.
  // Enumeration prevention (spec/27, Auth Architecture): the response must never reveal
  // whether an account exists. We still do the real work when applicable, but the caller
  // sees a uniform result.
  async forgotPassword(email: string): Promise<'sent'> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      return 'sent';
    }

    const emailAccount = await this.authRepository.findEmailAccountByUserId(user.id);
    if (!emailAccount) {
      // Google-only account: no password to reset. Stay silent to the API; the real
      // owner is helped out-of-band (they will simply log in with Google).
      return 'sent';
    }

    await this.authRepository.invalidateTokensByUserAndType(
      user.id,
      VerificationType.PASSWORD_RESET,
    );

    const resetToken = this.generateToken();
    await this.authRepository.createVerificationToken({
      userId: user.id,
      token: resetToken,
      type: VerificationType.PASSWORD_RESET,
      expiresAt: this.hoursFromNow(PASSWORD_RESET_TOKEN_EXPIRY_HOURS),
    });

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
    const lang = (user.language as 'EN' | 'MR') ?? 'EN';
    const { html: resetHtml, text: resetText } = await this.emailService.renderTemplate(
      createElement(PasswordResetEmail, { displayName: user.displayName, resetUrl, language: lang }),
    );
    await this.emailService.sendTransactional(email, getResetSubject(lang), resetHtml, resetText);
    return 'sent';
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const verificationToken = await this.authRepository.findVerificationToken(
      token,
      VerificationType.PASSWORD_RESET,
    );

    if (!verificationToken) {
      throw new TokenInvalidException();
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new TokenExpiredException('password reset');
    }

    const emailAccount = await this.authRepository.findEmailAccountByUserId(
      verificationToken.userId,
    );
    if (!emailAccount) {
      throw new EntityNotFoundException('AuthAccount', verificationToken.userId);
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.authRepository.updatePasswordHash(emailAccount.id, passwordHash);
    await this.authRepository.markTokenUsed(verificationToken.id);
    await this.authRepository.deleteAllUserSessions(verificationToken.userId);
  }

  async validateSession(token: string): Promise<SessionUser | null> {
    const session = await this.authRepository.findSessionByToken(token);

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await this.authRepository.deleteSession(token);
      return null;
    }

    if (session.user.deletedAt) {
      await this.authRepository.deleteSession(token);
      return null;
    }

    const newExpiresAt = this.daysFromNow(this.sessionTtlDays);
    await this.authRepository.updateSessionActivity(session.id, newExpiresAt);

    return this.toSessionUser(session.user);
  }

  // Step 1: account setup. Persists profile fields and marks account-setup complete.
  // Does not grant app access — the framework step must still be finished.
  async completeOnboarding(
    userId: string,
    displayName?: string,
    username?: string,
    language?: string,
    gender?: string,
    dob?: string,
  ): Promise<SessionUser> {
    if (username) {
      const existing = await this.authRepository.findUserByUsername(username);
      if (existing && existing.id !== userId) {
        throw new DuplicateEntityException('User', 'username');
      }
    }
    const user = await this.authRepository.markAccountSetupComplete(userId, {
      displayName,
      username,
      language: language as 'EN' | 'MR' | undefined,
      gender,
      dob: dob ? new Date(dob) : undefined,
    });
    // Username/displayName are first set here — index the user for search. A freshly
    // set-up account is public by default; a later privacy toggle re-syncs via UsersService.
    void this.usersIndex.upsert({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      isPublic: true,
    });
    return this.toSessionUser(user);
  }

  // Step 2: framework walkthrough complete → grants app access.
  async completeFramework(userId: string): Promise<SessionUser> {
    const user = await this.authRepository.markOnboardingComplete(userId);
    return this.toSessionUser(user);
  }

  async checkUsernameAvailability(username: string): Promise<{ available: boolean; reason?: 'invalid' | 'taken' }> {
    if (!USERNAME_REGEX.test(username)) {
      return { available: false, reason: 'invalid' };
    }
    const existing = await this.authRepository.findUserByUsername(username);
    return existing ? { available: false, reason: 'taken' } : { available: true };
  }

  async getCurrentUser(userId: string): Promise<SessionUser> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }
    return this.toSessionUser(user);
  }

  // ─── Account lockout ────────────────────────────────────────────────────────

  async checkLockout(email: string): Promise<{ locked: boolean; secondsRemaining: number }> {
    try {
      const key = `lockout:${email}`;
      const lockedUntil = await this.redis.hget(key, 'locked_until');
      if (!lockedUntil) return { locked: false, secondsRemaining: 0 };

      const lockedUntilMs = parseInt(lockedUntil, 10);
      if (isNaN(lockedUntilMs)) {
        this.logger.warn({ msg: 'Corrupt lockout value in Redis, failing open', email });
        return { locked: false, secondsRemaining: 0 };
      }
      const nowMs = Date.now();
      if (nowMs < lockedUntilMs) {
        const secondsRemaining = Math.ceil((lockedUntilMs - nowMs) / 1000);
        return { locked: true, secondsRemaining };
      }
      return { locked: false, secondsRemaining: 0 };
    } catch (err) {
      this.logger.warn({ msg: 'Redis error on lockout check, failing open', error: (err as Error).message });
      return { locked: false, secondsRemaining: 0 };
    }
  }

  async recordFailedLogin(
    email: string,
    ipAddress: string | null = null,
    userAgent: string | null = null,
    reason = 'bad_password',
  ): Promise<void> {
    this.auditService.record({ action: 'auth.login_failure', metadata: { email, reason }, ipAddress, userAgent });
    try {
      const key = `lockout:${email}`;
      const failures = await this.redis.hincrby(key, 'failures', 1);
      await this.redis.expire(key, LOCKOUT_WINDOW_SECONDS);
      if (failures >= LOCKOUT_MAX_FAILURES) {
        const lockedUntilMs = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
        await this.redis.hset(key, 'locked_until', lockedUntilMs.toString());
        await this.redis.expire(key, LOCKOUT_DURATION_SECONDS);
        this.auditService.record({ action: 'auth.account_lockout', metadata: { email, duration_minutes: LOCKOUT_DURATION_SECONDS / 60 }, ipAddress, userAgent });
      }
    } catch (err) {
      this.logger.warn({ msg: 'Redis error recording failed login', error: (err as Error).message });
    }
  }

  async clearLockout(email: string): Promise<void> {
    try {
      await this.redis.del(`lockout:${email}`);
    } catch (err) {
      this.logger.warn({ msg: 'Redis error clearing lockout', error: (err as Error).message });
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async generateUsername(email: string): Promise<string> {
    // Replace dots and hyphens with underscores, strip anything else invalid, clamp to 28 chars
    const base = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[.\-]/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')        // collapse consecutive underscores
      .replace(/^_+|_+$/g, '')   // trim leading/trailing underscores
      .slice(0, 28)
      || 'user';

    // Try the clean base first
    if (!(await this.authRepository.findUserByUsername(base))) {
      return base;
    }
    // Fall back to base_2, base_3, … up to base_99
    for (let n = 2; n <= 99; n++) {
      const candidate = `${base.slice(0, 25)}_${n}`;
      if (!(await this.authRepository.findUserByUsername(candidate))) {
        return candidate;
      }
    }
    // Extremely unlikely last resort
    return `${base.slice(0, 22)}_${randomBytes(3).toString('hex')}`;
  }

  private async createSession(params: CreateSessionParams): Promise<string> {
    const token = this.generateToken();
    const expiresAt = this.daysFromNow(params.ttlDays);

    await this.authRepository.createSession({
      userId: params.userId,
      token,
      expiresAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return token;
  }

  private generateToken(): string {
    return randomBytes(TOKEN_BYTES).toString('hex');
  }

  private toSessionUser(user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
    language: string;
    gender?: string | null;
    dob?: Date | null;
    avatarUrl?: string | null;
    roles: { role: Role }[];
    emailVerifiedAt: Date | null;
    accountSetupCompletedAt?: Date | null;
    onboardingCompletedAt: Date | null;
  }): SessionUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      language: user.language,
      gender: user.gender ?? null,
      dob: user.dob ?? null,
      avatarUrl: user.avatarUrl ?? null,
      roles: user.roles.map((r) => r.role),
      emailVerifiedAt: user.emailVerifiedAt,
      accountSetupCompletedAt: user.accountSetupCompletedAt ?? null,
      onboardingCompletedAt: user.onboardingCompletedAt,
    };
  }

  private daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private hoursFromNow(hours: number): Date {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  }

  private minutesFromNow(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }
}
