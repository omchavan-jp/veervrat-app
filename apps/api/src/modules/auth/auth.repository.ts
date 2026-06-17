import { Injectable } from '@nestjs/common';
import { AuthProvider, Role, VerificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Shared select shape that returns all fields needed for SessionUser
const userSelect = {
  id: true,
  email: true,
  displayName: true,
  username: true,
  language: true,
  gender: true,
  dob: true,
  avatarUrl: true,
  emailVerifiedAt: true,
  accountSetupCompletedAt: true,
  onboardingCompletedAt: true,
  suspendedAt: true,
  deletedAt: true,
  roles: { select: { role: true } },
} as const;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
      select: userSelect,
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: userSelect,
    });
  }

  async findUserByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username: username.toLowerCase(), deletedAt: null },
      select: { id: true },
    });
  }

  async createUserWithEmailAccount(params: {
    email: string;
    displayName: string;
    username: string;
    passwordHash: string;
    language?: 'EN' | 'MR';
  }) {
    return this.prisma.user.create({
      data: {
        email: params.email,
        displayName: params.displayName,
        username: params.username,
        language: params.language ?? 'EN',
        authAccounts: {
          create: {
            provider: AuthProvider.EMAIL,
            providerAccountId: params.email,
            passwordHash: params.passwordHash,
          },
        },
        roles: { create: { role: Role.VRATARTHI } },
      },
      select: userSelect,
    });
  }

  async createUserWithOAuthAccount(params: {
    email: string;
    displayName: string;
    username: string;
    provider: AuthProvider;
    providerAccountId: string;
    emailVerifiedAt: Date;
  }) {
    return this.prisma.user.create({
      data: {
        email: params.email,
        displayName: params.displayName,
        username: params.username,
        emailVerifiedAt: params.emailVerifiedAt,
        authAccounts: {
          create: {
            provider: params.provider,
            providerAccountId: params.providerAccountId,
          },
        },
        roles: { create: { role: Role.VRATARTHI } },
      },
      select: userSelect,
    });
  }

  async markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: userSelect,
    });
  }

  async findAuthAccount(provider: AuthProvider, providerAccountId: string) {
    return this.prisma.authAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: { select: userSelect } },
    });
  }

  async findEmailAccountByUserId(userId: string) {
    return this.prisma.authAccount.findFirst({
      where: { userId, provider: AuthProvider.EMAIL },
    });
  }

  async updatePasswordHash(accountId: string, passwordHash: string) {
    return this.prisma.authAccount.update({
      where: { id: accountId },
      data: { passwordHash },
    });
  }

  async createSession(params: {
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }) {
    return this.prisma.session.create({ data: params });
  }

  async findSessionByToken(token: string) {
    return this.prisma.session.findUnique({
      where: { token },
      include: { user: { select: userSelect } },
    });
  }

  async updateSessionActivity(sessionId: string, expiresAt: Date) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date(), expiresAt },
    });
  }

  async deleteSession(token: string) {
    return this.prisma.session.deleteMany({ where: { token } });
  }

  async deleteAllUserSessions(userId: string) {
    return this.prisma.session.deleteMany({ where: { userId } });
  }

  async createVerificationToken(params: {
    userId: string;
    token: string;
    type: VerificationType;
    expiresAt: Date;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.verificationToken.create({
      data: {
        ...params,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async addAuthAccount(params: { userId: string; provider: AuthProvider; providerAccountId: string }) {
    return this.prisma.authAccount.create({
      data: {
        userId: params.userId,
        provider: params.provider,
        providerAccountId: params.providerAccountId,
      },
    });
  }

  async findVerificationToken(token: string, type: VerificationType) {
    return this.prisma.verificationToken.findFirst({
      where: { token, type, usedAt: null },
      include: { user: { select: userSelect } },
    });
  }

  async markTokenUsed(tokenId: string) {
    return this.prisma.verificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  // Step 1 of onboarding (account setup): persist profile fields and mark account-setup
  // complete. Does NOT mark the whole onboarding complete — the framework step (step 2)
  // does that. Keeps the framework un-skippable (see markOnboardingComplete).
  async markAccountSetupComplete(
    userId: string,
    fields?: { displayName?: string; username?: string; language?: 'EN' | 'MR'; gender?: string; dob?: Date },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        accountSetupCompletedAt: new Date(),
        ...(fields?.displayName ? { displayName: fields.displayName } : {}),
        ...(fields?.username ? { username: fields.username } : {}),
        ...(fields?.language ? { language: fields.language } : {}),
        ...(fields?.gender ? { gender: fields.gender } : {}),
        ...(fields?.dob ? { dob: fields.dob } : {}),
      },
      select: userSelect,
    });
  }

  // Step 2 of onboarding (framework walkthrough complete): mark the whole onboarding done.
  // The app shell gate keys off onboardingCompletedAt, so this is what grants app access.
  async markOnboardingComplete(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
      select: userSelect,
    });
  }

  async invalidateTokensByUserAndType(userId: string, type: VerificationType) {
    return this.prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
