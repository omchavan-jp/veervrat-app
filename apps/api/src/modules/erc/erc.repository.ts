import { Injectable } from '@nestjs/common';
import { ErcStatus, ExposureTier } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException } from '../../common/exceptions/app.exceptions';

export type ErcType = 'exposure' | 'resolution' | 'challenge';

// ─── Return shapes ────────────────────────────────────────────────────────────

export type PoolExposure = {
  id: string; titleEn: string; descriptionEn: string | null; tier: ExposureTier;
  weaknessTags: { weaknessId: string }[];
};
export type PoolResolution = {
  id: string; titleEn: string; descriptionEn: string | null; durationWeeks: number | null;
  frequencyPerWeek: number | null; frequencyLabel: string | null;
  weaknessTags: { weaknessId: string }[];
};
export type PoolChallenge = {
  id: string; titleEn: string; descriptionEn: string | null; durationDays: number | null;
  weaknessTags: { weaknessId: string }[];
};

export type JourneyErcItem = {
  id: string; journeyId: string; status: ErcStatus; isDeactivated: boolean; isCustom: boolean;
  titleEn: string; descriptionEn: string | null;
  startedAt: Date | null; submittedAt: Date | null; approvedAt: Date | null;
  poolExposureId?: string | null; poolResolutionId?: string | null; poolChallengeId?: string | null;
  // Resolution-specific
  durationWeeks?: number | null; frequencyPerWeek?: number | null; frequencyLabel?: string | null;
  // Challenge-specific
  durationDays?: number | null;
  // Exposure-specific
  tier?: ExposureTier;
};

@Injectable()
export class ErcRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Pool queries ──────────────────────────────────────────────────────────

  async getPool(journeyId: string, ercType: ErcType): Promise<PoolExposure[] | PoolResolution[] | PoolChallenge[]> {
    // Get journey weakness IDs for union filter
    const journeyWeaknesses = await this.prisma.journeyWeakness.findMany({
      where: { journeyId },
      select: { weaknessId: true },
    });
    const weaknessIds = journeyWeaknesses.map((w) => w.weaknessId);
    if (weaknessIds.length === 0) return [];

    if (ercType === 'exposure') {
      // Exclude already-selected pool items (including deactivated ones)
      const selected = await this.prisma.journeyExposure.findMany({
        where: { journeyId, isCustom: false, poolExposureId: { not: null } },
        select: { poolExposureId: true },
      });
      const selectedIds = selected.map((s) => s.poolExposureId!);
      return this.prisma.exposure.findMany({
        where: {
          weaknessTags: { some: { weaknessId: { in: weaknessIds } } },
          ...(selectedIds.length ? { id: { notIn: selectedIds } } : {}),
        },
        select: { id: true, titleEn: true, descriptionEn: true, tier: true, weaknessTags: { select: { weaknessId: true } } },
        orderBy: { sortOrder: 'asc' },
      });
    }

    if (ercType === 'resolution') {
      const selected = await this.prisma.journeyResolution.findMany({
        where: { journeyId, isCustom: false, poolResolutionId: { not: null } },
        select: { poolResolutionId: true },
      });
      const selectedIds = selected.map((s) => s.poolResolutionId!);
      return this.prisma.resolution.findMany({
        where: {
          weaknessTags: { some: { weaknessId: { in: weaknessIds } } },
          ...(selectedIds.length ? { id: { notIn: selectedIds } } : {}),
        },
        select: { id: true, titleEn: true, descriptionEn: true, durationWeeks: true, frequencyPerWeek: true, frequencyLabel: true, weaknessTags: { select: { weaknessId: true } } },
        orderBy: { sortOrder: 'asc' },
      });
    }

    // challenge
    const selected = await this.prisma.journeyChallenge.findMany({
      where: { journeyId, isCustom: false, poolChallengeId: { not: null } },
      select: { poolChallengeId: true },
    });
    const selectedIds = selected.map((s) => s.poolChallengeId!);
    return this.prisma.challenge.findMany({
      where: {
        weaknessTags: { some: { weaknessId: { in: weaknessIds } } },
        ...(selectedIds.length ? { id: { notIn: selectedIds } } : {}),
      },
      select: { id: true, titleEn: true, descriptionEn: true, durationDays: true, weaknessTags: { select: { weaknessId: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Journey item queries ──────────────────────────────────────────────────

  async listJourneyItems(journeyId: string, ercType: ErcType): Promise<JourneyErcItem[]> {
    const common = { journeyId: true, status: true, isDeactivated: true, isCustom: true, titleEn: true, descriptionEn: true, startedAt: true, submittedAt: true, approvedAt: true };
    if (ercType === 'exposure') {
      const items = await this.prisma.journeyExposure.findMany({
        where: { journeyId },
        select: { id: true, ...common, tier: true, poolExposureId: true },
        orderBy: { createdAt: 'asc' },
      });
      return items.map((i) => ({ ...i, journeyId }));
    }
    if (ercType === 'resolution') {
      const items = await this.prisma.journeyResolution.findMany({
        where: { journeyId },
        select: { id: true, ...common, durationWeeks: true, frequencyPerWeek: true, frequencyLabel: true, poolResolutionId: true },
        orderBy: { createdAt: 'asc' },
      });
      return items.map((i) => ({ ...i, journeyId }));
    }
    const items = await this.prisma.journeyChallenge.findMany({
      where: { journeyId },
      select: { id: true, ...common, durationDays: true, poolChallengeId: true },
      orderBy: { createdAt: 'asc' },
    });
    return items.map((i) => ({ ...i, journeyId }));
  }

  async findById(id: string, ercType: ErcType): Promise<JourneyErcItem | null> {
    const common = { journeyId: true, status: true, isDeactivated: true, isCustom: true, titleEn: true, descriptionEn: true, startedAt: true, submittedAt: true, approvedAt: true };
    if (ercType === 'exposure') {
      const item = await this.prisma.journeyExposure.findUnique({ where: { id }, select: { id: true, ...common, tier: true, poolExposureId: true } });
      return item ? { ...item } : null;
    }
    if (ercType === 'resolution') {
      const item = await this.prisma.journeyResolution.findUnique({ where: { id }, select: { id: true, ...common, durationWeeks: true, frequencyPerWeek: true, frequencyLabel: true, poolResolutionId: true } });
      return item ? { ...item } : null;
    }
    const item = await this.prisma.journeyChallenge.findUnique({ where: { id }, select: { id: true, ...common, durationDays: true, poolChallengeId: true } });
    return item ? { ...item } : null;
  }

  async findByPoolItemId(journeyId: string, poolItemId: string, ercType: ErcType): Promise<{ id: string } | null> {
    if (ercType === 'exposure') {
      return this.prisma.journeyExposure.findFirst({ where: { journeyId, poolExposureId: poolItemId }, select: { id: true } });
    }
    if (ercType === 'resolution') {
      return this.prisma.journeyResolution.findFirst({ where: { journeyId, poolResolutionId: poolItemId }, select: { id: true } });
    }
    return this.prisma.journeyChallenge.findFirst({ where: { journeyId, poolChallengeId: poolItemId }, select: { id: true } });
  }

  async selectPoolItem(journeyId: string, poolItemId: string, ercType: ErcType): Promise<JourneyErcItem> {
    if (ercType === 'exposure') {
      const pool = await this.prisma.exposure.findUnique({ where: { id: poolItemId }, select: { titleEn: true, descriptionEn: true, tier: true } });
      if (!pool) throw new EntityNotFoundException('Exposure', poolItemId);
      const item = await this.prisma.journeyExposure.create({
        data: { journeyId, poolExposureId: poolItemId, titleEn: pool.titleEn, descriptionEn: pool.descriptionEn, tier: pool.tier },
        select: { id: true, journeyId: true, status: true, isDeactivated: true, isCustom: true, titleEn: true, descriptionEn: true, tier: true, startedAt: true, submittedAt: true, approvedAt: true, poolExposureId: true },
      });
      return item;
    }
    if (ercType === 'resolution') {
      const pool = await this.prisma.resolution.findUnique({ where: { id: poolItemId }, select: { titleEn: true, descriptionEn: true, durationWeeks: true, frequencyPerWeek: true, frequencyLabel: true } });
      if (!pool) throw new EntityNotFoundException('Resolution', poolItemId);
      const item = await this.prisma.journeyResolution.create({
        data: { journeyId, poolResolutionId: poolItemId, titleEn: pool.titleEn, descriptionEn: pool.descriptionEn, durationWeeks: pool.durationWeeks, frequencyPerWeek: pool.frequencyPerWeek, frequencyLabel: pool.frequencyLabel },
        select: { id: true, journeyId: true, status: true, isDeactivated: true, isCustom: true, titleEn: true, descriptionEn: true, durationWeeks: true, frequencyPerWeek: true, frequencyLabel: true, startedAt: true, submittedAt: true, approvedAt: true, poolResolutionId: true },
      });
      return item;
    }
    const pool = await this.prisma.challenge.findUnique({ where: { id: poolItemId }, select: { titleEn: true, descriptionEn: true, durationDays: true } });
    if (!pool) throw new EntityNotFoundException('Challenge', poolItemId);
    const item = await this.prisma.journeyChallenge.create({
      data: { journeyId, poolChallengeId: poolItemId, titleEn: pool.titleEn, descriptionEn: pool.descriptionEn, durationDays: pool.durationDays },
      select: { id: true, journeyId: true, status: true, isDeactivated: true, isCustom: true, titleEn: true, descriptionEn: true, durationDays: true, startedAt: true, submittedAt: true, approvedAt: true, poolChallengeId: true },
    });
    return item;
  }

  async updateStatus(id: string, status: ErcStatus, ercType: ErcType): Promise<JourneyErcItem> {
    const now = new Date();
    const timestamps: Record<string, Date | null> = {};
    if (status === ErcStatus.IN_PROGRESS) timestamps.startedAt = now;
    if (status === ErcStatus.SUBMITTED) timestamps.submittedAt = now;
    if (status === ErcStatus.APPROVED) timestamps.approvedAt = now;

    const common = { journeyId: true, status: true, isDeactivated: true, isCustom: true, titleEn: true, descriptionEn: true, startedAt: true, submittedAt: true, approvedAt: true };
    if (ercType === 'exposure') {
      const item = await this.prisma.journeyExposure.update({ where: { id }, data: { status, ...timestamps }, select: { id: true, ...common, tier: true, poolExposureId: true } });
      return item;
    }
    if (ercType === 'resolution') {
      const item = await this.prisma.journeyResolution.update({ where: { id }, data: { status, ...timestamps }, select: { id: true, ...common, durationWeeks: true, frequencyPerWeek: true, frequencyLabel: true, poolResolutionId: true } });
      return item;
    }
    const item = await this.prisma.journeyChallenge.update({ where: { id }, data: { status, ...timestamps }, select: { id: true, ...common, durationDays: true, poolChallengeId: true } });
    return item;
  }

  async setDeactivated(id: string, isDeactivated: boolean, ercType: ErcType): Promise<JourneyErcItem> {
    const common = { journeyId: true, status: true, isDeactivated: true, isCustom: true, titleEn: true, descriptionEn: true, startedAt: true, submittedAt: true, approvedAt: true };
    if (ercType === 'exposure') return this.prisma.journeyExposure.update({ where: { id }, data: { isDeactivated }, select: { id: true, ...common, tier: true, poolExposureId: true } });
    if (ercType === 'resolution') return this.prisma.journeyResolution.update({ where: { id }, data: { isDeactivated }, select: { id: true, ...common, durationWeeks: true, frequencyPerWeek: true, frequencyLabel: true, poolResolutionId: true } });
    return this.prisma.journeyChallenge.update({ where: { id }, data: { isDeactivated }, select: { id: true, ...common, durationDays: true, poolChallengeId: true } });
  }

  async remove(id: string, ercType: ErcType): Promise<void> {
    if (ercType === 'exposure') { await this.prisma.journeyExposure.delete({ where: { id } }); return; }
    if (ercType === 'resolution') { await this.prisma.journeyResolution.delete({ where: { id } }); return; }
    await this.prisma.journeyChallenge.delete({ where: { id } });
  }
}
