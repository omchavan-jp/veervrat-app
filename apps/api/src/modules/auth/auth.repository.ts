import { Injectable } from '@nestjs/common';
import { AuthProvider, VerificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async createUserWithEmailAccount(params: {
    email: string;
    name: string | null;
    passwordHash: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: params.email,
        name: params.name,
        authAccounts: {
          create: {
            provider: AuthProvider.EMAIL,
            providerAccountId: params.email,
            passwordHash: params.passwordHash,
          },
        },
      },
    });
  }

  async createUserWithOAuthAccount(params: {
    email: string;
    name: string | null;
    provider: AuthProvider;
    providerAccountId: string;
    emailVerifiedAt: Date;
  }) {
    return this.prisma.user.create({
      data: {
        email: params.email,
        name: params.name,
        emailVerifiedAt: params.emailVerifiedAt,
        authAccounts: {
          create: {
            provider: params.provider,
            providerAccountId: params.providerAccountId,
          },
        },
      },
    });
  }

  async markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async findAuthAccount(provider: AuthProvider, providerAccountId: string) {
    return this.prisma.authAccount.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
      include: { user: true },
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
      include: { user: true },
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
  }) {
    return this.prisma.verificationToken.create({ data: params });
  }

  async findVerificationToken(token: string, type: VerificationType) {
    return this.prisma.verificationToken.findFirst({
      where: { token, type, usedAt: null },
      include: { user: true },
    });
  }

  async markTokenUsed(tokenId: string) {
    return this.prisma.verificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async invalidateTokensByUserAndType(userId: string, type: VerificationType) {
    return this.prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
