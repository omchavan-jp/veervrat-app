import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthProvider, Role, VerificationType } from '@prisma/client';
import type Redis from 'ioredis';
import { AuthRepository } from './auth.repository';
import {
  ValidationException,
  UnderageException,
  SignupRequiredException,
  DuplicateEntityException,
  InvalidCredentialsException,
  EmailNotVerifiedException,
  AccountSuspendedException,
  TokenExpiredException,
  TokenInvalidException,
  EntityNotFoundException,
  EntityInUseException,
  AccountLockedException,
} from '../../common/exceptions/app.exceptions';
import { meetsMinimumAge } from '../../common/age/age';
import { outstandingConsents } from './consent/outstanding-consents';
import { POLICY_KEYS } from '../../database/policy-content';
import { REDIS_CLIENT } from '../../common/redis/redis.provider';
import {
  SessionUser,
  AuthResult,
  LinkPendingResult,
  GoogleProfile,
  CreateSessionParams,
} from './types/auth.types';
import { EmailService } from '../email/email.service';
import { UsersIndexService } from '../search/users-index.service';
import { AuditService } from '../audit/audit.service';
import {
  VerifyEmailEmail,
  getSubject as getVerifySubject,
} from '../email/templates/VerifyEmailEmail';
import {
  PasswordResetEmail,
  getSubject as getResetSubject,
} from '../email/templates/PasswordResetEmail';
import { EmailChangeEmail, getEmailChangeSubject } from '../email/templates/EmailChangeEmail';
import { createElement } from 'react';

// Long enough for a Google round trip, short enough that abandoned signups do not accumulate.
const PENDING_SIGNUP_TTL_MINUTES = 15;

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

  /**
   * Turns the documents the client says it showed into consent rows carrying the version that is
   * actually published right now.
   *
   * ⚠️ The client's version, if it sends one, is ignored. A page loaded before an administrator
   * bumped a document would otherwise record agreement to text the person never read — a record
   * that looks authoritative and is false, which is worse than no record.
   *
   * A document the client names but which does not exist is rejected: consent to nothing is not
   * consent.
   */
  /**
   * Policy documents this person has not accepted at the version now published.
   *
   * Both documents promise, in both languages, that a material change means being asked again.
   * That promise has been live since the documents were published and nothing honoured it
   * (deferred item 3.3) — `findConsents` and `recordConsent` existed and were called from
   * nowhere.
   *
   * A dedicated call rather than a field on `/auth/me`: the session is resolved server-side on
   * every document request, so anything added there is paid on every page load. This is checked
   * once per session.
   */
  async outstandingConsents(userId: string): Promise<{ documentKey: string; version: number }[]> {
    const accepted = await this.authRepository.findConsents(userId);
    const current = await this.authRepository.currentPolicyVersions(POLICY_KEYS);
    return outstandingConsents(accepted, current);
  }

  /**
   * Records acceptance of everything currently outstanding.
   *
   * The versions come from the database, never from the request. A client that could name its
   * own version could claim acceptance of text nobody ever showed it — the same reasoning as
   * `resolveConsents` at signup, and the reason this takes no version parameter at all.
   */
  async acceptOutstandingConsents(
    userId: string,
  ): Promise<{ documentKey: string; version: number }[]> {
    const outstanding = await this.outstandingConsents(userId);

    for (const { documentKey, version } of outstanding) {
      await this.authRepository.recordConsent(userId, documentKey, version);
    }

    return outstanding;
  }

  private async resolveConsents(
    claimed: { documentKey: string; version: number }[],
  ): Promise<{ documentKey: string; version: number }[]> {
    const keys = [...new Set(claimed.map((c) => c.documentKey))];
    const live = await this.authRepository.currentPolicyVersions(keys);

    return keys.map((documentKey) => {
      const version = live.get(documentKey);
      if (version === undefined) {
        throw new ValidationException(`Unknown policy document: ${documentKey}`);
      }
      return { documentKey, version };
    });
  }

  async register(
    email: string,
    password: string,
    displayName: string,
    username: string,
    dob: string,
    consents: { documentKey: string; version: number }[],
    language?: string,
  ): Promise<{ user: SessionUser }> {
    // The age check runs before anything else, and before the duplicate-email check: someone
    // under the minimum age should not learn whether an address is registered.
    const dateOfBirth = new Date(dob);
    if (Number.isNaN(dateOfBirth.getTime()) || !meetsMinimumAge(dateOfBirth)) {
      throw new UnderageException();
    }

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
      dob: dateOfBirth,
      consents: await this.resolveConsents(consents),
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
    await this.emailService.sendTransactional(
      email,
      getVerifySubject(lang),
      verifyHtml,
      verifyText,
    );

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
      this.auditService.record({
        action: 'auth.account_lockout',
        metadata: { email, duration_minutes: LOCKOUT_DURATION_SECONDS / 60 },
        ipAddress,
        userAgent,
      });
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

    if (user.suspendedAt) {
      throw new AccountSuspendedException();
    }

    await this.clearLockout(email);

    const sessionToken = await this.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      ttlDays: this.sessionTtlDays,
    });

    this.auditService.record({
      actorId: user.id,
      action: 'auth.login_success',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { method: 'credentials' },
      ipAddress,
      userAgent,
    });

    return { user: this.toSessionUser(user), sessionToken };
  }

  /**
   * Creates a pending signup and returns its id, which travels in the OAuth `state` parameter.
   *
   * The date of birth is validated HERE, before the redirect — so an underage visitor is turned
   * away without a Google round trip and, more importantly, without an account ever existing.
   * A blocking check after the callback would still leave a row behind for someone the platform
   * is not for.
   */
  async startGoogleSignup(
    username: string,
    dob: string,
    consents: { documentKey: string; version: number }[],
    language?: string,
  ): Promise<{ pendingId: string }> {
    const dateOfBirth = new Date(dob);
    if (Number.isNaN(dateOfBirth.getTime()) || !meetsMinimumAge(dateOfBirth)) {
      throw new UnderageException();
    }

    // Checked now so the person is told immediately rather than after a Google round trip.
    // Re-checked on the way back, because minutes pass and someone else may take it.
    if (await this.authRepository.findUserByUsername(username)) {
      throw new DuplicateEntityException('User', 'username');
    }

    const pending = await this.authRepository.createPendingSignup({
      username,
      dob: dateOfBirth,
      // Resolved before the redirect so the record matches what was published when the person
      // actually agreed, not when they come back from Google.
      consents: await this.resolveConsents(consents),
      language: language as 'EN' | 'MR' | undefined,
      expiresAt: new Date(Date.now() + PENDING_SIGNUP_TTL_MINUTES * 60 * 1000),
    });

    return { pendingId: pending.id };
  }

  async handleGoogleLogin(
    profile: GoogleProfile,
    ipAddress: string | null,
    userAgent: string | null,
    pendingSignupId?: string,
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
      await this.authRepository.invalidateTokensByUserAndType(
        existingUser.id,
        VerificationType.GOOGLE_LINK,
      );
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
          // Carried so linkGoogleAccount can decide whether to mark the address verified
          // without re-contacting Google.
          emailVerified: profile.emailVerified,
        },
      });
      return { action: 'link_pending', token: linkToken };
    }

    // No existing account, and no existing user to link to. This is the ONLY branch that creates
    // a user — and it now requires a pending signup, which is what separates Google *signup*
    // from Google *sign-in*.
    //
    // Reaching here without one means somebody used sign-in without signing up. Previously that
    // created an account silently, which under an 18+ policy means holding a record for someone
    // whose age was never checked.
    const pending = pendingSignupId
      ? await this.authRepository.consumePendingSignup(pendingSignupId)
      : null;

    if (!pending) {
      throw new SignupRequiredException();
    }

    // Re-checked after the round trip. The record could have been created before a date change,
    // and the check is cheap — trusting a value because it was validated earlier is how gates
    // get bypassed.
    if (!meetsMinimumAge(pending.dob)) {
      throw new UnderageException();
    }

    // The username the person chose before leaving for Google. If it was taken in the interval,
    // a variant of THEIR choice is used rather than one derived from their email address —
    // failing here would mean losing a completed Google round trip over a name collision.
    const username = await this.claimUsername(pending.username);

    const user = await this.authRepository.createUserWithOAuthAccount({
      email: profile.email,
      displayName: profile.name ?? profile.email.split('@')[0],
      username,
      provider: AuthProvider.GOOGLE,
      providerAccountId: profile.googleId,
      emailVerifiedAt: new Date(),
      dob: pending.dob,
      consents: pending.consents as { documentKey: string; version: number }[],
      language: pending.language,
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
    if (verificationToken.expiresAt < new Date()) {
      throw new TokenExpiredException('google link');
    }

    const emailAccount = await this.authRepository.findEmailAccountByUserId(
      verificationToken.userId,
    );
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
    const metadata = raw as {
      googleId: string;
      googleEmail: string;
      displayName: string | null;
      emailVerified?: boolean;
    };

    await this.authRepository.addAuthAccount({
      userId: verificationToken.userId,
      provider: AuthProvider.GOOGLE,
      providerAccountId: metadata.googleId,
    });

    await this.authRepository.markTokenUsed(verificationToken.id);

    // Google has confirmed this address AND the user proved the account password, so ownership
    // is established twice over. Without this the account links, Google sign-in works, and
    // credential sign-in on the SAME account still refuses for an unverified email.
    //
    // Gated on Google's own claim rather than assumed: `emailVerified` absent (an older token,
    // or a federated identity Google has not confirmed) leaves the address unverified.
    if (metadata.emailVerified === true) {
      await this.authRepository.markEmailVerified(verificationToken.userId);
    }

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

  // Admin force-logout: invalidate every session a user holds. Used by suspend/anonymise
  // and the standalone force-logout admin action.
  async forceLogout(userId: string): Promise<void> {
    await this.authRepository.deleteAllUserSessions(userId);
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
  /**
   * Re-send the verification email for an unverified credential account.
   *
   * ALWAYS returns 'sent', for every input. An address with no account, an already-verified
   * address, and a Google-only account are indistinguishable from a genuine resend — any
   * observable difference would turn this into "does this person have a Veervrat account?",
   * answerable for any address someone cares to try. `forgotPassword` below takes the same
   * shape for the same reason.
   *
   * The route is under the strict auth throttle: it sends mail to a caller-chosen address, so
   * without a limit it is a way to deliver repeated mail to someone else's inbox.
   */
  async resendVerification(email: string): Promise<'sent'> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      return 'sent';
    }

    if (user.emailVerifiedAt) {
      return 'sent';
    }

    const emailAccount = await this.authRepository.findEmailAccountByUserId(user.id);
    if (!emailAccount) {
      // Google-only account: verification is meaningless here, they sign in with Google.
      return 'sent';
    }

    // Invalidate first, so a burst of requests cannot leave several usable links live against
    // one inbox.
    await this.authRepository.invalidateTokensByUserAndType(
      user.id,
      VerificationType.EMAIL_VERIFICATION,
    );

    const verificationToken = this.generateToken();
    await this.authRepository.createVerificationToken({
      userId: user.id,
      token: verificationToken,
      type: VerificationType.EMAIL_VERIFICATION,
      expiresAt: this.hoursFromNow(VERIFICATION_TOKEN_EXPIRY_HOURS),
    });

    const verifyUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${verificationToken}`;
    const lang = user.language ?? 'EN';
    const { html, text } = await this.emailService.renderTemplate(
      createElement(VerifyEmailEmail, {
        displayName: user.displayName,
        verifyUrl,
        language: lang,
      }),
    );
    await this.emailService.sendTransactional(email, getVerifySubject(lang), html, text);

    return 'sent';
  }

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
    const lang = user.language ?? 'EN';
    const { html: resetHtml, text: resetText } = await this.emailService.renderTemplate(
      createElement(PasswordResetEmail, {
        displayName: user.displayName,
        resetUrl,
        language: lang,
      }),
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
    // Completing a reset means the user received a token sent to their address — the same
    // proof the verification link provides. Without this, a user can reset successfully and
    // still be refused at login for an unverified email, with nothing offering a way out.
    await this.authRepository.markEmailVerified(verificationToken.userId);
    await this.authRepository.deleteAllUserSessions(verificationToken.userId);
  }

  // Authenticated password change — requires the current password. Returns a fresh session
  // token so the caller stays logged in while all prior sessions are invalidated.
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ sessionToken: string }> {
    const emailAccount = await this.authRepository.findEmailAccountByUserId(userId);
    if (!emailAccount?.passwordHash) {
      // Google-only account — no password to change.
      throw new EntityNotFoundException('AuthAccount', userId);
    }
    const valid = await bcrypt.compare(currentPassword, emailAccount.passwordHash);
    if (!valid) throw new InvalidCredentialsException();

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.authRepository.updatePasswordHash(emailAccount.id, passwordHash);
    // Invalidate every existing session, then mint a new one for this caller.
    await this.authRepository.deleteAllUserSessions(userId);
    const sessionToken = await this.createSession({
      userId,
      ipAddress: null,
      userAgent: null,
      ttlDays: this.sessionTtlDays,
    });
    return { sessionToken };
  }

  // Verify a user's password (re-auth gate for sensitive self-service actions like delete).
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const emailAccount = await this.authRepository.findEmailAccountByUserId(userId);
    if (!emailAccount?.passwordHash) return false;
    return bcrypt.compare(password, emailAccount.passwordHash);
  }

  // ─── Connected accounts ──────────────────────────────────────────────────────
  async listConnectedAccounts(
    userId: string,
  ): Promise<{ provider: AuthProvider; connectedAt: Date }[]> {
    const accounts = await this.authRepository.listAuthAccounts(userId);
    return accounts.map((a) => ({ provider: a.provider, connectedAt: a.createdAt }));
  }

  async disconnectAccount(
    userId: string,
    provider: AuthProvider,
  ): Promise<{ provider: AuthProvider }> {
    const accounts = await this.authRepository.listAuthAccounts(userId);
    const target = accounts.find((a) => a.provider === provider);
    if (!target) throw new EntityNotFoundException('AuthAccount', provider);

    // A login method counts if it can authenticate: an EMAIL account with a password, or any
    // OAuth provider. Block removing the last one (would orphan the account).
    const remainingLoginMethods = accounts.filter(
      (a) => a.id !== target.id && (a.provider !== AuthProvider.EMAIL || !!a.passwordHash),
    ).length;
    if (remainingLoginMethods === 0) {
      throw new EntityInUseException('Login method', 'you cannot remove your only way to sign in');
    }

    await this.authRepository.deleteAuthAccount(target.id);
    return { provider };
  }

  async requestEmailChange(
    userId: string,
    newEmail: string,
    currentPassword: string,
  ): Promise<'sent'> {
    const normalized = newEmail.trim().toLowerCase();
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new EntityNotFoundException('User', userId);

    const emailAccount = await this.authRepository.findEmailAccountByUserId(userId);
    if (!emailAccount?.passwordHash) throw new EntityNotFoundException('AuthAccount', userId);
    const valid = await bcrypt.compare(currentPassword, emailAccount.passwordHash);
    if (!valid) throw new InvalidCredentialsException();

    if (normalized === user.email.toLowerCase())
      throw new DuplicateEntityException('User', 'email');
    if (await this.authRepository.emailInUse(normalized))
      throw new DuplicateEntityException('User', 'email');

    await this.authRepository.setPendingEmail(userId, normalized);
    await this.authRepository.invalidateTokensByUserAndType(userId, VerificationType.EMAIL_CHANGE);
    const token = this.generateToken();
    await this.authRepository.createVerificationToken({
      userId,
      token,
      type: VerificationType.EMAIL_CHANGE,
      expiresAt: this.hoursFromNow(PASSWORD_RESET_TOKEN_EXPIRY_HOURS),
      metadata: { newEmail: normalized },
    });

    const confirmUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/confirm-email-change?token=${token}`;
    const lang = user.language ?? 'EN';
    const { html, text } = await this.emailService.renderTemplate(
      createElement(EmailChangeEmail, {
        displayName: user.displayName,
        confirmUrl,
        language: lang,
      }),
    );
    await this.emailService.sendTransactional(normalized, getEmailChangeSubject(lang), html, text);
    return 'sent';
  }

  async confirmEmailChange(token: string): Promise<{ user: SessionUser }> {
    const verificationToken = await this.authRepository.findVerificationToken(
      token,
      VerificationType.EMAIL_CHANGE,
    );
    if (!verificationToken) throw new TokenInvalidException();
    if (verificationToken.expiresAt < new Date()) throw new TokenExpiredException('email change');

    const pending = await this.authRepository.getPendingEmail(verificationToken.userId);
    const intended = (verificationToken.metadata as { newEmail?: string } | null)?.newEmail;
    if (!pending || !intended || pending.toLowerCase() !== intended.toLowerCase()) {
      // Pending email was cleared or superseded — token no longer valid.
      throw new TokenInvalidException();
    }
    // Guard against the address being taken between request and confirm.
    if (await this.authRepository.emailInUse(pending))
      throw new DuplicateEntityException('User', 'email');

    const user = await this.authRepository.applyEmailChange(verificationToken.userId, pending);
    await this.authRepository.markTokenUsed(verificationToken.id);
    return { user: this.toSessionUser(user) };
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

    if (session.user.deletedAt || session.user.suspendedAt) {
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

  async checkUsernameAvailability(
    username: string,
  ): Promise<{ available: boolean; reason?: 'invalid' | 'taken' }> {
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
      this.logger.warn({
        msg: 'Redis error on lockout check, failing open',
        error: (err as Error).message,
      });
      return { locked: false, secondsRemaining: 0 };
    }
  }

  async recordFailedLogin(
    email: string,
    ipAddress: string | null = null,
    userAgent: string | null = null,
    reason = 'bad_password',
  ): Promise<void> {
    this.auditService.record({
      action: 'auth.login_failure',
      metadata: { email, reason },
      ipAddress,
      userAgent,
    });
    try {
      const key = `lockout:${email}`;
      const failures = await this.redis.hincrby(key, 'failures', 1);
      await this.redis.expire(key, LOCKOUT_WINDOW_SECONDS);
      if (failures >= LOCKOUT_MAX_FAILURES) {
        const lockedUntilMs = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
        await this.redis.hset(key, 'locked_until', lockedUntilMs.toString());
        await this.redis.expire(key, LOCKOUT_DURATION_SECONDS);
        this.auditService.record({
          action: 'auth.account_lockout',
          metadata: { email, duration_minutes: LOCKOUT_DURATION_SECONDS / 60 },
          ipAddress,
          userAgent,
        });
      }
    } catch (err) {
      this.logger.warn({
        msg: 'Redis error recording failed login',
        error: (err as Error).message,
      });
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

  /**
   * Takes the username the person chose, and returns it — or the nearest available variant of it.
   *
   * Only reached when someone claimed the same name during the Google round trip, which is a few
   * minutes wide. Refusing at that point would discard a completed sign-in over a name clash,
   * and deriving a fresh name from their email address would discard their choice. A numbered
   * variant of what they picked keeps the intent.
   */
  private async claimUsername(chosen: string): Promise<string> {
    if (!(await this.authRepository.findUserByUsername(chosen))) {
      return chosen;
    }
    for (let n = 2; n <= 99; n++) {
      const candidate = `${chosen.slice(0, 25)}_${n}`;
      if (!(await this.authRepository.findUserByUsername(candidate))) {
        return candidate;
      }
    }
    return `${chosen.slice(0, 22)}_${randomBytes(3).toString('hex')}`;
  }

  private async generateUsername(email: string): Promise<string> {
    // Replace dots and hyphens with underscores, strip anything else invalid, clamp to 28 chars
    const base =
      email
        .split('@')[0]
        .toLowerCase()
        .replace(/[.-]/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_') // collapse consecutive underscores
        .replace(/^_+|_+$/g, '') // trim leading/trailing underscores
        .slice(0, 28) || 'user';

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
