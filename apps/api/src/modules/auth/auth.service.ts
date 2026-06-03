import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthProvider, Role, VerificationType } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import {
  DuplicateEntityException,
  InvalidCredentialsException,
  EmailNotVerifiedException,
  TokenExpiredException,
  TokenInvalidException,
  OAuthAccountConflictException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import { SessionUser, AuthResult, GoogleProfile, CreateSessionParams } from './types/auth.types';

const BCRYPT_ROUNDS = 12;
const TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly sessionTtlDays: number;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly configService: ConfigService,
  ) {
    this.sessionTtlDays = this.configService.get<number>('SESSION_TTL_DAYS', 30);
  }

  async register(
    email: string,
    password: string,
    displayName: string,
    username: string,
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
    });

    const verificationToken = this.generateToken();
    await this.authRepository.createVerificationToken({
      userId: user.id,
      token: verificationToken,
      type: VerificationType.EMAIL_VERIFICATION,
      expiresAt: this.hoursFromNow(VERIFICATION_TOKEN_EXPIRY_HOURS),
    });

    this.logger.log(`[EMAIL VERIFICATION] User: ${user.email}, Token: ${verificationToken}`);

    return { user: this.toSessionUser(user) };
  }

  async login(
    email: string,
    password: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<AuthResult> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const emailAccount = await this.authRepository.findEmailAccountByUserId(user.id);
    if (!emailAccount?.passwordHash) {
      throw new InvalidCredentialsException();
    }

    const passwordValid = await bcrypt.compare(password, emailAccount.passwordHash);
    if (!passwordValid) {
      throw new InvalidCredentialsException();
    }

    if (!user.emailVerifiedAt) {
      throw new EmailNotVerifiedException();
    }

    const sessionToken = await this.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      ttlDays: this.sessionTtlDays,
    });

    return { user: this.toSessionUser(user), sessionToken };
  }

  async handleGoogleLogin(
    profile: GoogleProfile,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<AuthResult> {
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
      throw new OAuthAccountConflictException();
    }

    // For OAuth users, generate a username from email until they complete onboarding
    const baseUsername = profile.email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase();
    const username = `${baseUsername}_${Math.random().toString(36).slice(2, 7)}`;

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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      return;
    }

    const emailAccount = await this.authRepository.findEmailAccountByUserId(user.id);
    if (!emailAccount) {
      return;
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

    this.logger.log(`[PASSWORD RESET] User: ${user.email}, Token: ${resetToken}`);
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

  async completeOnboarding(userId: string, displayName?: string): Promise<SessionUser> {
    const user = await this.authRepository.markOnboardingComplete(userId, displayName);
    return this.toSessionUser(user);
  }

  async getCurrentUser(userId: string): Promise<SessionUser> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }
    return this.toSessionUser(user);
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
    roles: { role: Role }[];
    emailVerifiedAt: Date | null;
    onboardingCompletedAt: Date | null;
  }): SessionUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      language: user.language,
      roles: user.roles.map((r) => r.role),
      emailVerifiedAt: user.emailVerifiedAt,
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
}
