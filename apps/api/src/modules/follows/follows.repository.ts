import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FollowsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(followerId: string, followeeId: string): Promise<boolean> {
    const row = await this.prisma.userFollow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
      select: { followerId: true },
    });
    return row !== null;
  }

  async follow(followerId: string, followeeId: string): Promise<void> {
    await this.prisma.userFollow.upsert({
      where: { followerId_followeeId: { followerId, followeeId } },
      create: { followerId, followeeId },
      update: {},
    });
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    await this.prisma.userFollow.deleteMany({ where: { followerId, followeeId } });
  }

  async countFollowers(userId: string): Promise<number> {
    return this.prisma.userFollow.count({ where: { followeeId: userId } });
  }

  async countFollowing(userId: string): Promise<number> {
    return this.prisma.userFollow.count({ where: { followerId: userId } });
  }

  // True when both directions exist (mutual follow = "friends").
  async areMutualFollows(a: string, b: string): Promise<boolean> {
    const count = await this.prisma.userFollow.count({
      where: {
        OR: [
          { followerId: a, followeeId: b },
          { followerId: b, followeeId: a },
        ],
      },
    });
    return count === 2;
  }
}
