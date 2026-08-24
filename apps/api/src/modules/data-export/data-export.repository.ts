import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Every query behind a self-service data export, gathered in one place.
 *
 * Two things are deliberately excluded, and the reason belongs here rather than only in a commit
 * message, since the next field added to `User` needs the same judgment applied to it:
 *
 * - **`AuthAccount.passwordHash`** — never returned to anyone, including its owner. A password
 *   hash is not something portability obligations are about, and handing it out — even to the
 *   person it belongs to — is pure downside.
 * - **`AuditEvent`** — a security record about what an *administrator* did, not primarily a
 *   record of the requester's own data. Left out pending the legal review in #134; flagged
 *   rather than silently omitted.
 */
@Injectable()
export class DataExportRepository {
  constructor(private readonly prisma: PrismaService) {}

  identity(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        username: true,
        dob: true,
        gender: true,
        language: true,
        roles: { select: { role: true } },
        emailVerifiedAt: true,
        accountSetupCompletedAt: true,
        onboardingCompletedAt: true,
        createdAt: true,
      },
    });
  }

  authAccounts(userId: string) {
    return this.prisma.authAccount.findMany({
      where: { userId },
      select: { provider: true, providerAccountId: true, createdAt: true },
    });
  }

  consents(userId: string) {
    return this.prisma.userConsent.findMany({
      where: { userId },
      select: { documentKey: true, version: true, acceptedAt: true },
    });
  }

  testAttempts(userId: string) {
    return this.prisma.testAttempt.findMany({
      where: { userId },
      select: {
        id: true,
        isDraft: true,
        submittedAt: true,
        createdAt: true,
        weakness: { select: { nameEn: true } },
        answers: { select: { sentenceId: true, score: true, createdAt: true } },
      },
    });
  }

  journeys(userId: string) {
    return this.prisma.journey.findMany({
      where: { vratarthiId: userId },
      select: {
        id: true,
        title: true,
        state: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        exposures: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            // Active only — a revoked sidenote is a mentor's retracted comment, already invisible
            // to this person in every other view of their own journey. The export must not show
            // more than the product does.
            vmSidenote: {
              where: { revokedAt: null },
              select: { text: true, acknowledgedAt: true },
            },
          },
        },
        resolutions: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            vmSidenote: {
              where: { revokedAt: null },
              select: { text: true, acknowledgedAt: true },
            },
            checkins: { select: { status: true, createdAt: true } },
          },
        },
        challenges: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            vmSidenote: {
              where: { revokedAt: null },
              select: { text: true, acknowledgedAt: true },
            },
          },
        },
      },
    });
  }

  experienceLogs(userId: string) {
    return this.prisma.experienceLog.findMany({
      where: { authorId: userId, deletedAt: null },
      select: {
        id: true,
        body: true,
        visibility: true,
        isDraft: true,
        publishedAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Every message in a room this person is party to, sent by either side.
   *
   * `roomId` is `chat:<idA>:<idB>` with the two ids sorted, not a foreign key — so membership is
   * a string match. A message someone else sent to them is included because it is already
   * visible to them the moment they open that conversation; excluding it would make the export
   * less complete than the chat screen itself.
   */
  chatMessages(userId: string) {
    return this.prisma.chatMessage.findMany({
      where: { roomId: { contains: userId } },
      select: { roomId: true, senderId: true, body: true, createdAt: true },
      orderBy: [{ roomId: 'asc' }, { seqNo: 'asc' }],
    });
  }

  blogs(userId: string) {
    return this.prisma.blog.findMany({
      where: { authorId: userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        body: true,
        isDraft: true,
        publishedAt: true,
        createdAt: true,
      },
    });
  }

  blogComments(userId: string) {
    return this.prisma.blogComment.findMany({
      where: { authorId: userId, deletedAt: null },
      select: { id: true, blogId: true, body: true, createdAt: true },
    });
  }
}
