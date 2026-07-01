import { Injectable } from '@nestjs/common';
import { ErcStatus, JourneyState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ErcType = 'exposure' | 'resolution' | 'challenge';

export type ActionErcItem = {
  id: string;
  journeyId: string;
  journeyTitle: string;
  vratarthiId: string;
  ercType: ErcType;
  status: ErcStatus;
  titleEn: string;
  titleMr: string | null;
  submittedAt: Date | null;
  updatedAt: Date;
};

export type ActionSuggestion = {
  id: string;
  vmId: string;
  journeyId: string;
  journeyTitle: string;
  vratarthiId: string;
  ercType: ErcType;
  itemId: string;
  itemTitleEn: string;
  itemTitleMr: string | null;
  text: string;
  acknowledgedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type ActionJourney = {
  id: string;
  title: string;
  vratarthiId: string;
  completionSubmittedAt: Date | null;
};

export type ActionCustomReview = {
  id: string;
  journeyId: string;
  journeyTitle: string;
  vratarthiId: string;
  ercType: ErcType;
  status: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

// One row per (journey ERC table) — the three tables share the same relevant columns.
const ERC_ITEM_SELECT = {
  id: true,
  journeyId: true,
  status: true,
  titleEn: true,
  titleMr: true,
  submittedAt: true,
  updatedAt: true,
  journey: { select: { title: true, vratarthiId: true } },
} as const;

@Injectable()
export class ActionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── ERC items by status across a set of journeys ────────────────────────────

  async findErcItemsByStatus(
    journeyIds: string[],
    statuses: ErcStatus[],
  ): Promise<ActionErcItem[]> {
    if (journeyIds.length === 0) return [];
    const where = {
      journeyId: { in: journeyIds },
      status: { in: statuses },
      isDeactivated: false,
    };

    const [exposures, resolutions, challenges] = await Promise.all([
      this.prisma.journeyExposure.findMany({ where, select: ERC_ITEM_SELECT }),
      this.prisma.journeyResolution.findMany({ where, select: ERC_ITEM_SELECT }),
      this.prisma.journeyChallenge.findMany({ where, select: ERC_ITEM_SELECT }),
    ]);

    const map = (rows: typeof exposures, ercType: ErcType): ActionErcItem[] =>
      rows.map((r) => ({
        id: r.id,
        journeyId: r.journeyId,
        journeyTitle: r.journey.title,
        vratarthiId: r.journey.vratarthiId,
        ercType,
        status: r.status,
        titleEn: r.titleEn,
        titleMr: r.titleMr,
        submittedAt: r.submittedAt,
        updatedAt: r.updatedAt,
      }));

    return [
      ...map(exposures, 'exposure'),
      ...map(resolutions, 'resolution'),
      ...map(challenges, 'challenge'),
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // ─── Active VM sidenotes (suggestions) across a set of journeys ───────────────

  async findActiveSidenotes(
    journeyIds: string[],
    opts: { onlyUnacknowledged?: boolean } = {},
  ): Promise<ActionSuggestion[]> {
    if (journeyIds.length === 0) return [];

    const rows = await this.prisma.vmSidenote.findMany({
      where: {
        revokedAt: null,
        ...(opts.onlyUnacknowledged ? { acknowledgedAt: null } : {}),
        OR: [
          { journeyExposure: { journeyId: { in: journeyIds } } },
          { journeyResolution: { journeyId: { in: journeyIds } } },
          { journeyChallenge: { journeyId: { in: journeyIds } } },
        ],
      },
      select: {
        id: true,
        vmId: true,
        text: true,
        acknowledgedAt: true,
        revokedAt: true,
        createdAt: true,
        journeyExposure: {
          select: {
            id: true,
            titleEn: true,
            titleMr: true,
            journeyId: true,
            journey: { select: { title: true, vratarthiId: true } },
          },
        },
        journeyResolution: {
          select: {
            id: true,
            titleEn: true,
            titleMr: true,
            journeyId: true,
            journey: { select: { title: true, vratarthiId: true } },
          },
        },
        journeyChallenge: {
          select: {
            id: true,
            titleEn: true,
            titleMr: true,
            journeyId: true,
            journey: { select: { title: true, vratarthiId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => {
      const item = r.journeyExposure ?? r.journeyResolution ?? r.journeyChallenge!;
      const ercType: ErcType = r.journeyExposure
        ? 'exposure'
        : r.journeyResolution
          ? 'resolution'
          : 'challenge';
      return {
        id: r.id,
        vmId: r.vmId,
        journeyId: item.journeyId,
        journeyTitle: item.journey.title,
        vratarthiId: item.journey.vratarthiId,
        ercType,
        itemId: item.id,
        itemTitleEn: item.titleEn,
        itemTitleMr: item.titleMr,
        text: r.text,
        acknowledgedAt: r.acknowledgedAt,
        revokedAt: r.revokedAt,
        createdAt: r.createdAt,
      };
    });
  }

  // ─── Journeys with a completion awaiting VM approval ──────────────────────────

  async findJourneysPendingCompletion(journeyIds: string[]): Promise<ActionJourney[]> {
    if (journeyIds.length === 0) return [];
    const rows = await this.prisma.journey.findMany({
      where: {
        id: { in: journeyIds },
        completionSubmittedAt: { not: null },
        completedAt: null,
        deletedAt: null,
      },
      select: { id: true, title: true, vratarthiId: true, completionSubmittedAt: true },
      orderBy: { completionSubmittedAt: 'asc' },
    });
    return rows;
  }

  // ─── Custom ERC review status across a set of journeys ─────────────────────────

  async findCustomErcReviews(journeyIds: string[]): Promise<ActionCustomReview[]> {
    if (journeyIds.length === 0) return [];
    const itemJourney = {
      select: { journeyId: true, journey: { select: { title: true, vratarthiId: true } } },
    };
    const rows = await this.prisma.customErcReview.findMany({
      where: {
        OR: [
          { journeyExposure: { journeyId: { in: journeyIds } } },
          { journeyResolution: { journeyId: { in: journeyIds } } },
          { journeyChallenge: { journeyId: { in: journeyIds } } },
        ],
      },
      select: {
        id: true,
        status: true,
        reviewNote: true,
        reviewedAt: true,
        createdAt: true,
        journeyExposure: itemJourney,
        journeyResolution: itemJourney,
        journeyChallenge: itemJourney,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => {
      const item = r.journeyExposure ?? r.journeyResolution ?? r.journeyChallenge!;
      const ercType: ErcType = r.journeyExposure
        ? 'exposure'
        : r.journeyResolution
          ? 'resolution'
          : 'challenge';
      return {
        id: r.id,
        journeyId: item.journeyId,
        journeyTitle: item.journey.title,
        vratarthiId: item.journey.vratarthiId,
        ercType,
        status: r.status,
        reviewNote: r.reviewNote,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
      };
    });
  }

  // ─── VA-owned journey ids ─────────────────────────────────────────────────────

  async findOwnedJourneys(
    vratarthiId: string,
  ): Promise<{ id: string; title: string; state: JourneyState }[]> {
    return this.prisma.journey.findMany({
      where: { vratarthiId, deletedAt: null },
      select: { id: true, title: true, state: true },
    });
  }

  // ─── New (unselected) pool ERC available for active journeys ──────────────────
  // Returns journeys that have at least one pool ERC item matching their weaknesses
  // that the VA has not yet selected — the "new ERC available" nudge (screen-spec 4).
  async findJourneysWithNewErc(
    journeys: { id: string; title: string; state: JourneyState }[],
  ): Promise<{ journeyId: string; journeyTitle: string }[]> {
    const active = journeys.filter((j) => j.state === JourneyState.ACTIVE);
    if (active.length === 0) return [];

    const results = await Promise.all(
      active.map(async (j) => {
        const weaknesses = await this.prisma.journeyWeakness.findMany({
          where: { journeyId: j.id },
          select: { weaknessId: true },
        });
        const weaknessIds = weaknesses.map((w) => w.weaknessId);
        if (weaknessIds.length === 0) return null;

        const [selExp, selRes, selChal] = await Promise.all([
          this.prisma.journeyExposure.findMany({
            where: { journeyId: j.id, poolExposureId: { not: null } },
            select: { poolExposureId: true },
          }),
          this.prisma.journeyResolution.findMany({
            where: { journeyId: j.id, poolResolutionId: { not: null } },
            select: { poolResolutionId: true },
          }),
          this.prisma.journeyChallenge.findMany({
            where: { journeyId: j.id, poolChallengeId: { not: null } },
            select: { poolChallengeId: true },
          }),
        ]);
        const expIds = selExp.map((s) => s.poolExposureId!);
        const resIds = selRes.map((s) => s.poolResolutionId!);
        const chalIds = selChal.map((s) => s.poolChallengeId!);

        const [expAvail, resAvail, chalAvail] = await Promise.all([
          this.prisma.exposure.count({
            where: {
              weaknessTags: { some: { weaknessId: { in: weaknessIds } } },
              ...(expIds.length ? { id: { notIn: expIds } } : {}),
            },
          }),
          this.prisma.resolution.count({
            where: {
              weaknessTags: { some: { weaknessId: { in: weaknessIds } } },
              ...(resIds.length ? { id: { notIn: resIds } } : {}),
            },
          }),
          this.prisma.challenge.count({
            where: {
              weaknessTags: { some: { weaknessId: { in: weaknessIds } } },
              ...(chalIds.length ? { id: { notIn: chalIds } } : {}),
            },
          }),
        ]);

        if (expAvail + resAvail + chalAvail === 0) return null;
        return { journeyId: j.id, journeyTitle: j.title };
      }),
    );

    return results.filter((r): r is { journeyId: string; journeyTitle: string } => r !== null);
  }
}
