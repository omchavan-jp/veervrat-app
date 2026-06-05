import { Injectable } from '@nestjs/common';
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

    const [journeysCompleted, journeysActive, testsTaken] = await Promise.all([
      this.prisma.journey.count({
        where: { vratarthiId: user.id, state: 'COMPLETED', deletedAt: null },
      }),
      this.prisma.journey.count({
        where: { vratarthiId: user.id, state: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.testAttempt.count({
        where: { userId: user.id, isDraft: false },
      }),
    ]);

    return {
      ...user,
      journeysCompleted,
      journeysActive,
      testsTaken,
      publicExperienceCount: user._count.experienceLogs,
    };
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
