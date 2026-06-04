import { Injectable } from '@nestjs/common';
import { ErcStatus, JourneyState, VmRelationshipState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { JourneySlim, JourneyVmAssignmentSlim, VmRelationshipSlim } from '../../common/permissions/types';

const journeySelect = {
  id: true,
  title: true,
  state: true,
  vratarthiId: true,
  sentenceId: true,
  startedAt: true,
  completedAt: true,
  pausedAt: true,
  dormantSince: true,
  createdAt: true,
  updatedAt: true,
  sentence: {
    select: {
      id: true,
      textEn: true,
      textMr: true,
      subvirtue: {
        select: {
          id: true,
          nameEn: true,
          nameMr: true,
          virtue: { select: { id: true, nameEn: true, nameMr: true } },
        },
      },
    },
  },
  weaknesses: {
    select: {
      weakness: { select: { id: true, nameEn: true, nameMr: true } },
    },
  },
  vmAssignments: {
    select: { id: true, vmId: true, state: true },
    where: { state: VmRelationshipState.ACTIVE },
  },
  _count: {
    select: {
      exposures: true,
      resolutions: true,
      challenges: true,
    },
  },
} as const;

@Injectable()
export class JourneysRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveForSentence(userId: string, sentenceId: string) {
    return this.prisma.journey.findFirst({
      where: {
        vratarthiId: userId,
        sentenceId,
        state: { in: [JourneyState.ACTIVE, JourneyState.PAUSED, JourneyState.DORMANT, JourneyState.NOT_STARTED] },
        deletedAt: null,
      },
      select: { id: true, state: true },
    });
  }

  async create(params: { vratarthiId: string; sentenceId: string; weaknessId: string; title: string }) {
    return this.prisma.journey.create({
      data: {
        vratarthiId: params.vratarthiId,
        sentenceId: params.sentenceId,
        title: params.title,
        state: JourneyState.ACTIVE,
        startedAt: new Date(),
        weaknesses: {
          create: { weaknessId: params.weaknessId },
        },
      },
      select: journeySelect,
    });
  }

  async findAll(userId: string, cursor?: string) {
    const items = await this.prisma.journey.findMany({
      where: { vratarthiId: userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        state: true,
        updatedAt: true,
        sentence: { select: { textEn: true } },
        weaknesses: {
          select: { weakness: { select: { nameEn: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const nextCursor = items.length === 20 ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async findById(id: string) {
    const journey = await this.prisma.journey.findUnique({
      where: { id, deletedAt: null },
      select: journeySelect,
    });
    if (!journey) return null;

    // Fetch global VM + all ERC counts in parallel (was sequential)
    const [globalVm, expCounts, resCounts, chalCounts] = await Promise.all([
      this.prisma.vmRelationship.findFirst({
        where: { vratarthiId: journey.vratarthiId, state: VmRelationshipState.ACTIVE },
        select: { vmId: true, vratarthiId: true, state: true },
      }),
      this.prisma.journeyExposure.groupBy({
        by: ['status'],
        where: { journeyId: id },
        _count: { id: true },
      }),
      this.prisma.journeyResolution.groupBy({
        by: ['status'],
        where: { journeyId: id },
        _count: { id: true },
      }),
      this.prisma.journeyChallenge.groupBy({
        by: ['status'],
        where: { journeyId: id },
        _count: { id: true },
      }),
    ]);

    const countByStatus = (groups: { status: ErcStatus; _count: { id: number } }[]) => ({
      total: groups.reduce((s, g) => s + g._count.id, 0),
      active: groups.find((g) => g.status === ErcStatus.IN_PROGRESS)?._count.id ?? 0,
      approved: groups.find((g) => g.status === ErcStatus.APPROVED)?._count.id ?? 0,
    });

    return {
      ...journey,
      weaknesses: journey.weaknesses.map((w) => w.weakness),
      globalVmRelationship: globalVm as VmRelationshipSlim | null,
      ercCounts: {
        exposures: countByStatus(expCounts),
        resolutions: countByStatus(resCounts),
        challenges: countByStatus(chalCounts),
      },
    };
  }

  async updateState(id: string, state: JourneyState) {
    const timestamps: Record<string, Date | null> = {};
    if (state === JourneyState.PAUSED) timestamps.pausedAt = new Date();
    if (state === JourneyState.ACTIVE) { timestamps.pausedAt = null; timestamps.dormantSince = null; }

    return this.prisma.journey.update({
      where: { id },
      data: { state, ...timestamps },
      select: { id: true, state: true, pausedAt: true, dormantSince: true, updatedAt: true },
    });
  }

  async updateTitle(id: string, title: string) {
    return this.prisma.journey.update({
      where: { id },
      data: { title },
      select: { id: true, title: true },
    });
  }

  buildJourneySlim(journey: {
    id: string;
    vratarthiId: string;
    vmAssignments: JourneyVmAssignmentSlim[];
    globalVmRelationship?: VmRelationshipSlim | null;
  }): JourneySlim {
    return {
      id: journey.id,
      vratarthiId: journey.vratarthiId,
      vmAssignments: journey.vmAssignments,
      globalVmRelationship: journey.globalVmRelationship ?? null,
    };
  }
}
