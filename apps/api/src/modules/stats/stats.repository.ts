import { Injectable } from '@nestjs/common';
import { CheckinStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type PlatformStats = {
  vratarthis: number;
  vratmitras: number;
  testsSolved: number;
  practiceDaysCompleted: number;
};

@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Four global, platform-wide counts (spec/decisions/11_platform-stats.md).
   *
   * - vratarthis: total registered users holding the VRATARTHI role.
   * - vratmitras: distinct users who have acted as VM at least once.
   * - testsSolved: total non-draft (completed) test attempts.
   * - practiceDaysCompleted: total logged resolution check-ins where the VA
   *   actually practised (DONE or PARTIAL). The spec's prototype formula
   *   (N(resolutions) × N(vratarthis) × days) was synthetic; with real
   *   check-in data this is the honest "days of practice" count.
   */
  async getPlatformStats(): Promise<PlatformStats> {
    const [vratarthis, vmIds, testsSolved, practiceDaysCompleted] = await Promise.all([
      this.prisma.userRole.count({ where: { role: Role.VRATARTHI } }),
      this.prisma.vmRelationship.findMany({ select: { vmId: true }, distinct: ['vmId'] }),
      this.prisma.testAttempt.count({ where: { isDraft: false } }),
      this.prisma.resolutionCheckin.count({
        where: { status: { in: [CheckinStatus.DONE, CheckinStatus.PARTIAL] } },
      }),
    ]);

    return {
      vratarthis,
      vratmitras: vmIds.length,
      testsSolved,
      practiceDaysCompleted,
    };
  }
}
