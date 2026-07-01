import { Injectable } from '@nestjs/common';
import { ErcStatus, JourneyState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type DashboardStats = {
  virtues: { count: number };
  subvirtues: { count: number };
  journeys: { active: number; completed: number };
  exposures: { active: number; completed: number };
  resolutions: { active: number; completed: number };
  challenges: { active: number; completed: number };
  weaknesses: { explored: number };
  tests: { taken: number };
};

export type SuggestionItem = {
  sentenceId: string;
  sentenceTextEn: string;
  sentenceTextMr: string | null;
  score: number;
  subvirtueId: string;
  subvirtueNameEn: string;
  subvirtueNameMr: string | null;
  virtueId: string;
  virtueNameEn: string;
  virtueNameMr: string | null;
  weaknessId: string;
  weaknessNameEn: string;
  weaknessNameMr: string | null;
};

const ACTIVE_JOURNEY_STATES = [JourneyState.ACTIVE, JourneyState.NOT_STARTED] as const;

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const [journeyData, testData, virtueData] = await Promise.all([
      this.prisma.journey.findMany({
        where: { vratarthiId: userId, deletedAt: null },
        select: {
          id: true,
          state: true,
          exposures: {
            select: { status: true },
            where: { isDeactivated: false },
          },
          resolutions: {
            select: { status: true },
            where: { isDeactivated: false },
          },
          challenges: {
            select: { status: true },
            where: { isDeactivated: false },
          },
        },
      }),
      Promise.all([
        this.prisma.testAttempt.count({
          where: { userId, isDraft: false },
        }),
        this.prisma.testAttempt.findMany({
          where: { userId, isDraft: false },
          select: { weaknessId: true },
          distinct: ['weaknessId'],
        }),
      ]),
      this.prisma.journey.findMany({
        where: {
          vratarthiId: userId,
          deletedAt: null,
          state: { in: [...ACTIVE_JOURNEY_STATES] },
        },
        select: {
          sentence: {
            select: {
              subvirtue: {
                select: {
                  id: true,
                  virtue: { select: { id: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const [testsTaken, distinctWeaknesses] = testData;

    const journeysActive = journeyData.filter((j) =>
      ACTIVE_JOURNEY_STATES.includes(j.state as (typeof ACTIVE_JOURNEY_STATES)[number]),
    ).length;
    const journeysCompleted = journeyData.filter((j) => j.state === JourneyState.COMPLETED).length;

    const exposuresActive = journeyData
      .flatMap((j) => j.exposures)
      .filter((e) => e.status === ErcStatus.IN_PROGRESS).length;
    const exposuresCompleted = journeyData
      .flatMap((j) => j.exposures)
      .filter((e) => e.status === ErcStatus.APPROVED).length;
    const resolutionsActive = journeyData
      .flatMap((j) => j.resolutions)
      .filter((r) => r.status === ErcStatus.IN_PROGRESS).length;
    const resolutionsCompleted = journeyData
      .flatMap((j) => j.resolutions)
      .filter((r) => r.status === ErcStatus.APPROVED).length;
    const challengesActive = journeyData
      .flatMap((j) => j.challenges)
      .filter((c) => c.status === ErcStatus.IN_PROGRESS).length;
    const challengesCompleted = journeyData
      .flatMap((j) => j.challenges)
      .filter((c) => c.status === ErcStatus.APPROVED).length;

    const subvirtueIds = new Set(virtueData.map((j) => j.sentence.subvirtue.id));
    const virtueIds = new Set(virtueData.map((j) => j.sentence.subvirtue.virtue.id));

    return {
      virtues: { count: virtueIds.size },
      subvirtues: { count: subvirtueIds.size },
      journeys: { active: journeysActive, completed: journeysCompleted },
      exposures: { active: exposuresActive, completed: exposuresCompleted },
      resolutions: { active: resolutionsActive, completed: resolutionsCompleted },
      challenges: { active: challengesActive, completed: challengesCompleted },
      weaknesses: { explored: distinctWeaknesses.length },
      tests: { taken: testsTaken },
    };
  }

  async getSuggestions(userId: string): Promise<SuggestionItem[]> {
    // Get distinct weaknesses where user has submitted tests
    const weaknesses = await this.prisma.testAttempt.findMany({
      where: { userId, isDraft: false },
      select: { weaknessId: true },
      distinct: ['weaknessId'],
    });

    if (weaknesses.length === 0) return [];

    // For each weakness, get the most recent submitted attempt with low-score answers (sentenceId + score only)
    const rawAnswers: {
      sentenceId: string;
      score: number;
      weaknessId: string;
      weaknessNameEn: string;
      weaknessNameMr: string | null;
    }[] = [];

    await Promise.all(
      weaknesses.map(async ({ weaknessId }) => {
        const latestAttempt = await this.prisma.testAttempt.findFirst({
          where: { userId, weaknessId, isDraft: false },
          orderBy: { submittedAt: 'desc' },
          select: {
            weakness: { select: { id: true, nameEn: true, nameMr: true } },
            answers: {
              where: { score: { lte: 2 } },
              select: { sentenceId: true, score: true },
            },
          },
        });

        if (!latestAttempt) return;

        for (const a of latestAttempt.answers) {
          rawAnswers.push({
            sentenceId: a.sentenceId,
            score: a.score,
            weaknessId: latestAttempt.weakness.id,
            weaknessNameEn: latestAttempt.weakness.nameEn,
            weaknessNameMr: latestAttempt.weakness.nameMr,
          });
        }
      }),
    );

    if (rawAnswers.length === 0) return [];

    // Deduplicate by sentenceId — keep lowest score
    const byId = new Map<
      string,
      {
        sentenceId: string;
        score: number;
        weaknessId: string;
        weaknessNameEn: string;
        weaknessNameMr: string | null;
      }
    >();
    for (const a of rawAnswers) {
      const existing = byId.get(a.sentenceId);
      if (!existing || a.score < existing.score) {
        byId.set(a.sentenceId, a);
      }
    }

    const deduped = [...byId.values()].sort((a, b) => a.score - b.score).slice(0, 20);
    const sentenceIds = deduped.map((d) => d.sentenceId);

    // Fetch sentence + subvirtue + virtue data for the deduped set
    const sentences = await this.prisma.sentence.findMany({
      where: { id: { in: sentenceIds } },
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
    });

    const sentenceMap = new Map(sentences.map((s) => [s.id, s]));

    return deduped.flatMap((d) => {
      const s = sentenceMap.get(d.sentenceId);
      if (!s) return [];
      return [
        {
          sentenceId: s.id,
          sentenceTextEn: s.textEn,
          sentenceTextMr: s.textMr,
          score: d.score,
          subvirtueId: s.subvirtue.id,
          subvirtueNameEn: s.subvirtue.nameEn,
          subvirtueNameMr: s.subvirtue.nameMr,
          virtueId: s.subvirtue.virtue.id,
          virtueNameEn: s.subvirtue.virtue.nameEn,
          virtueNameMr: s.subvirtue.virtue.nameMr,
          weaknessId: d.weaknessId,
          weaknessNameEn: d.weaknessNameEn,
          weaknessNameMr: d.weaknessNameMr,
        },
      ];
    });
  }
}
