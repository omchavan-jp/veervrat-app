import { Injectable } from '@nestjs/common';
import { InvitationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ownProfileSelect = {
  id: true,
  email: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  gender: true,
  dob: true,
  language: true,
  showLastActive: true,
  showOnlineIndicator: true,
  profilePrivate: true,
  profileVisibility: true,
  notificationPrefs: true,
  lastActiveAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const publicProfileSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  showLastActive: true,
  showOnlineIndicator: true,
  profilePrivate: true,
  profileVisibility: true,
  lastActiveAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: ownProfileSelect,
    });
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username: username.toLowerCase(), deletedAt: null },
      select: {
        ...publicProfileSelect,
        _count: {
          select: {
            journeys: true,
            experienceLogs: {
              where: { visibility: 'PUBLIC', isDraft: false, deletedAt: null },
            },
          },
        },
      },
    });

    if (!user) return null;

    const journeyOwner = { journey: { vratarthiId: user.id, deletedAt: null } };
    const [
      journeysCompleted,
      journeysActive,
      testsTaken,
      weaknessesWorkedOn,
      exposuresActive,
      exposuresCompleted,
      resolutionsActive,
      resolutionsCompleted,
      challengesCompleted,
    ] = await Promise.all([
      this.prisma.journey.count({
        where: { vratarthiId: user.id, state: 'COMPLETED', deletedAt: null },
      }),
      this.prisma.journey.count({
        where: { vratarthiId: user.id, state: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.testAttempt.count({
        where: { userId: user.id, isDraft: false },
      }),
      this.prisma.journeyWeakness.findMany({
        where: journeyOwner,
        select: { weaknessId: true },
        distinct: ['weaknessId'],
      }),
      this.prisma.journeyExposure.count({ where: { ...journeyOwner, status: 'IN_PROGRESS' } }),
      this.prisma.journeyExposure.count({ where: { ...journeyOwner, status: 'APPROVED' } }),
      this.prisma.journeyResolution.count({ where: { ...journeyOwner, status: 'IN_PROGRESS' } }),
      this.prisma.journeyResolution.count({ where: { ...journeyOwner, status: 'APPROVED' } }),
      this.prisma.journeyChallenge.count({ where: { ...journeyOwner, status: 'APPROVED' } }),
    ]);

    // VM credibility: completed journeys this user was the assigned VM for (spec/22).
    const guidedJourneysCompleted = await this.prisma.journeyVmAssignment.count({
      where: { vmId: user.id, journey: { state: 'COMPLETED', deletedAt: null } },
    });

    return {
      ...user,
      journeysCompleted,
      journeysActive,
      testsTaken,
      weaknessesWorkedOn: weaknessesWorkedOn.length,
      exposuresActive,
      exposuresCompleted,
      resolutionsActive,
      resolutionsCompleted,
      challengesCompleted,
      publicExperienceCount: user._count.experienceLogs,
      guidedJourneysCompleted,
    };
  }

  async updateVisibility(
    id: string,
    fields: {
      profilePrivate?: boolean;
      showLastActive?: boolean;
      showOnlineIndicator?: boolean;
      profileVisibility?: Record<string, boolean>;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(fields.profilePrivate !== undefined ? { profilePrivate: fields.profilePrivate } : {}),
        ...(fields.showLastActive !== undefined ? { showLastActive: fields.showLastActive } : {}),
        ...(fields.showOnlineIndicator !== undefined
          ? { showOnlineIndicator: fields.showOnlineIndicator }
          : {}),
        ...(fields.profileVisibility !== undefined
          ? { profileVisibility: fields.profileVisibility }
          : {}),
      },
      select: ownProfileSelect,
    });
  }

  async updateSettings(
    id: string,
    fields: {
      language?: string;
      profilePrivate?: boolean;
      showLastActive?: boolean;
      showOnlineIndicator?: boolean;
      notificationPrefs?: Record<string, boolean>;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(fields.language !== undefined ? { language: fields.language as 'EN' | 'MR' } : {}),
        ...(fields.profilePrivate !== undefined ? { profilePrivate: fields.profilePrivate } : {}),
        ...(fields.showLastActive !== undefined ? { showLastActive: fields.showLastActive } : {}),
        ...(fields.showOnlineIndicator !== undefined
          ? { showOnlineIndicator: fields.showOnlineIndicator }
          : {}),
        ...(fields.notificationPrefs !== undefined
          ? { notificationPrefs: fields.notificationPrefs }
          : {}),
      },
      select: ownProfileSelect,
    });
  }

  // Replace PII with a pseudonym and soft-delete + suspend. Content keyed by id is retained.
  anonymise(
    id: string,
    pseudonym: { displayName: string; email: string; username: string },
    at: Date,
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        displayName: pseudonym.displayName,
        email: pseudonym.email,
        username: pseudonym.username,
        avatarUrl: null,
        anonymisedAt: at,
        deletedAt: at,
        suspendedAt: at,
      },
      select: { id: true, anonymisedAt: true },
    });
  }

  cancelPendingInvitations(inviterId: string) {
    return this.prisma.invitation.updateMany({
      where: { inviterId, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.CANCELLED },
    });
  }

  async updateProfile(
    id: string,
    fields: {
      displayName?: string;
      username?: string;
      gender?: string | null;
      dob?: Date | null;
      language?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(fields.displayName !== undefined ? { displayName: fields.displayName } : {}),
        ...(fields.username !== undefined ? { username: fields.username.toLowerCase() } : {}),
        ...(fields.gender !== undefined ? { gender: fields.gender } : {}),
        ...(fields.dob !== undefined ? { dob: fields.dob } : {}),
        ...(fields.language !== undefined ? { language: fields.language as 'EN' | 'MR' } : {}),
      },
      select: ownProfileSelect,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true, displayName: true, language: true },
    });
  }

  // Slim username → identity lookup (no profile aggregation). For follow targets etc.
  async findIdByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username: username.toLowerCase(), deletedAt: null },
      select: { id: true, username: true, displayName: true },
    });
  }

  async findByUsernameWithEmail(username: string) {
    return this.prisma.user.findFirst({
      where: { username: username.toLowerCase(), deletedAt: null },
      select: { id: true, username: true, email: true },
    });
  }

  // All non-deleted users, shaped for the search index seed.
  async listForIndex() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, username: true, displayName: true, profilePrivate: true },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      isPublic: !u.profilePrivate,
    }));
  }

  // Hydrate search hits — identity, avatar, presence, and privacy flags.
  async findManyByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.prisma.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        profilePrivate: true,
        showLastActive: true,
        showOnlineIndicator: true,
        lastActiveAt: true,
      },
    });
  }

  async isUsernameTaken(username: string, excludeUserId: string): Promise<boolean> {
    const existing = await this.prisma.user.findFirst({
      where: {
        username: username.toLowerCase(),
        deletedAt: null,
        NOT: { id: excludeUserId },
      },
      select: { id: true },
    });
    return existing !== null;
  }
}
