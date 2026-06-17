import { Injectable } from '@nestjs/common';
import { CheckinStatus, ErcStatus, JourneyState, VmRelationshipState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { JourneySlim, JourneyVmAssignmentSlim, VmRelationshipSlim } from '../../common/permissions/types';

export type JourneyActivityEventType =
  | 'erc_started'
  | 'erc_submitted'
  | 'erc_approved'
  | 'checkin'
  | 'vm_suggestion';

export type JourneyActivityEvent = {
  id: string;
  type: JourneyActivityEventType;
  at: string;
  ercType: 'exposure' | 'resolution' | 'challenge';
  itemId: string;
  titleEn: string;
  titleMr: string | null;
  checkinStatus?: CheckinStatus;
};

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
        sentence: { select: { textEn: true, textMr: true } },
        weaknesses: {
          select: { weakness: { select: { nameEn: true, nameMr: true } } },
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

  // Recent-activity feed for the Status Overview tab (spec/27). Aggregates the most
  // recent events across a journey's ERC items, check-ins, and VM sidenotes into a
  // single time-ordered list. Read-only — derived from existing timestamps, no new table.
  async getActivity(journeyId: string, limit = 8): Promise<JourneyActivityEvent[]> {
    const ercItemSelect = {
      id: true,
      titleEn: true,
      titleMr: true,
      status: true,
      submittedAt: true,
      approvedAt: true,
      startedAt: true,
      updatedAt: true,
    } as const;

    const [exposures, resolutions, challenges, checkins, sidenotes] = await Promise.all([
      this.prisma.journeyExposure.findMany({ where: { journeyId }, select: ercItemSelect }),
      this.prisma.journeyResolution.findMany({ where: { journeyId }, select: ercItemSelect }),
      this.prisma.journeyChallenge.findMany({ where: { journeyId }, select: ercItemSelect }),
      this.prisma.resolutionCheckin.findMany({
        where: { journeyResolution: { journeyId } },
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          journeyResolution: { select: { id: true, titleEn: true, titleMr: true } },
        },
        orderBy: { checkedInAt: 'desc' },
        take: limit,
      }),
      this.prisma.vmSidenote.findMany({
        where: {
          revokedAt: null,
          OR: [
            { journeyExposure: { journeyId } },
            { journeyResolution: { journeyId } },
            { journeyChallenge: { journeyId } },
          ],
        },
        select: {
          id: true,
          createdAt: true,
          journeyExposure: { select: { id: true, titleEn: true, titleMr: true } },
          journeyResolution: { select: { id: true, titleEn: true, titleMr: true } },
          journeyChallenge: { select: { id: true, titleEn: true, titleMr: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const events: JourneyActivityEvent[] = [];

    const pushErcStatusEvent = (
      ercType: 'exposure' | 'resolution' | 'challenge',
      item: {
        id: string;
        titleEn: string;
        titleMr: string | null;
        status: ErcStatus;
        submittedAt: Date | null;
        approvedAt: Date | null;
        startedAt: Date | null;
      },
    ) => {
      // Surface the most meaningful timestamp the item has reached.
      const at = item.approvedAt ?? item.submittedAt ?? item.startedAt;
      if (!at) return;
      const kind =
        item.approvedAt != null ? 'erc_approved' : item.submittedAt != null ? 'erc_submitted' : 'erc_started';
      events.push({
        id: `${ercType}:${item.id}:${kind}`,
        type: kind,
        at: at.toISOString(),
        ercType,
        itemId: item.id,
        titleEn: item.titleEn,
        titleMr: item.titleMr,
      });
    };

    exposures.forEach((i) => pushErcStatusEvent('exposure', i));
    resolutions.forEach((i) => pushErcStatusEvent('resolution', i));
    challenges.forEach((i) => pushErcStatusEvent('challenge', i));

    checkins.forEach((c) => {
      events.push({
        id: `checkin:${c.id}`,
        type: 'checkin',
        at: c.checkedInAt.toISOString(),
        ercType: 'resolution',
        itemId: c.journeyResolution.id,
        titleEn: c.journeyResolution.titleEn,
        titleMr: c.journeyResolution.titleMr,
        checkinStatus: c.status,
      });
    });

    sidenotes.forEach((s) => {
      const item = s.journeyExposure ?? s.journeyResolution ?? s.journeyChallenge;
      if (!item) return;
      const ercType = s.journeyExposure ? 'exposure' : s.journeyResolution ? 'resolution' : 'challenge';
      events.push({
        id: `sidenote:${s.id}`,
        type: 'vm_suggestion',
        at: s.createdAt.toISOString(),
        ercType,
        itemId: item.id,
        titleEn: item.titleEn,
        titleMr: item.titleMr,
      });
    });

    return events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
  }

  async setCompleted(id: string) {
    return this.prisma.journey.update({
      where: { id },
      data: { state: JourneyState.COMPLETED, completedAt: new Date(), completionSubmittedAt: null },
      select: { id: true, state: true, completedAt: true, updatedAt: true },
    });
  }

  async markCompletionSubmitted(id: string) {
    return this.prisma.journey.update({
      where: { id },
      data: { completionSubmittedAt: new Date() },
      select: { id: true, completionSubmittedAt: true, updatedAt: true },
    });
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

  // ACTIVE, non-deleted journeys untouched since `cutoff` (spec/04: dormant after 30 days of
  // no views or updates — `updatedAt` is the available signal). Returns each journey's VA and
  // its active journey-VM ids so the cron can notify both (spec/04 dormant nudge).
  async findStaleActiveJourneys(cutoff: Date): Promise<
    { id: string; vratarthiId: string; vmIds: string[] }[]
  > {
    const rows = await this.prisma.journey.findMany({
      where: {
        state: JourneyState.ACTIVE,
        deletedAt: null,
        updatedAt: { lt: cutoff },
      },
      select: {
        id: true,
        vratarthiId: true,
        vmAssignments: {
          where: { state: VmRelationshipState.ACTIVE, endedAt: null },
          select: { vmId: true },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      vratarthiId: r.vratarthiId,
      vmIds: r.vmAssignments.map((a) => a.vmId),
    }));
  }

  async markDormant(id: string, when: Date): Promise<void> {
    await this.prisma.journey.update({
      where: { id },
      data: { state: JourneyState.DORMANT, dormantSince: when },
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
