import { Injectable } from '@nestjs/common';
import { ErcEntityType, ErcStatus, ExposureTier } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException } from '../../common/exceptions/app.exceptions';

export type ErcType = 'exposure' | 'resolution' | 'challenge';

// ─── Return shapes ────────────────────────────────────────────────────────────

export type PoolExposure = {
  id: string;
  titleEn: string;
  titleMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
  tier: ExposureTier;
  weaknessTags: { weaknessId: string }[];
};
export type PoolResolution = {
  id: string;
  titleEn: string;
  titleMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
  durationWeeks: number | null;
  frequencyPerWeek: number | null;
  frequencyLabel: string | null;
  weaknessTags: { weaknessId: string }[];
};
export type PoolChallenge = {
  id: string;
  titleEn: string;
  titleMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
  durationDays: number | null;
  weaknessTags: { weaknessId: string }[];
};

export type VmSidenoteSlim = {
  id: string;
  vmId: string;
  text: string;
  acknowledgedAt: Date | null;
  createdAt: Date;
};

export type JourneyErcItem = {
  id: string;
  journeyId: string;
  status: ErcStatus;
  isDeactivated: boolean;
  isCustom: boolean;
  titleEn: string;
  titleMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
  startedAt: Date | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  createdById: string | null;
  reviewStatus: string | null;
  poolExposureId?: string | null;
  poolResolutionId?: string | null;
  poolChallengeId?: string | null;
  // Resolution-specific
  durationWeeks?: number | null;
  frequencyPerWeek?: number | null;
  frequencyLabel?: string | null;
  // Challenge-specific
  durationDays?: number | null;
  // Exposure-specific
  tier?: ExposureTier;
  // VM sidenote (active only — revokedAt IS NULL)
  vmSidenote?: VmSidenoteSlim | null;
};

@Injectable()
export class ErcRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Pool queries ──────────────────────────────────────────────────────────

  async getPool(
    journeyId: string,
    ercType: ErcType,
  ): Promise<PoolExposure[] | PoolResolution[] | PoolChallenge[]> {
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
        select: {
          id: true,
          titleEn: true,
          titleMr: true,
          descriptionEn: true,
          descriptionMr: true,
          tier: true,
          weaknessTags: { select: { weaknessId: true } },
        },
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
        select: {
          id: true,
          titleEn: true,
          titleMr: true,
          descriptionEn: true,
          descriptionMr: true,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
          weaknessTags: { select: { weaknessId: true } },
        },
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
      select: {
        id: true,
        titleEn: true,
        titleMr: true,
        descriptionEn: true,
        descriptionMr: true,
        durationDays: true,
        weaknessTags: { select: { weaknessId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Journey item queries ──────────────────────────────────────────────────

  async listJourneyItems(journeyId: string, ercType: ErcType): Promise<JourneyErcItem[]> {
    const common = {
      journeyId: true,
      status: true,
      isDeactivated: true,
      isCustom: true,
      titleEn: true,
      titleMr: true,
      descriptionEn: true,
      descriptionMr: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      createdById: true,
      reviewStatus: true,
    };
    if (ercType === 'exposure') {
      const items = await this.prisma.journeyExposure.findMany({
        where: { journeyId },
        select: {
          id: true,
          ...common,
          tier: true,
          poolExposureId: true,
          ...this.sidenoteRelationSelect,
        },
        orderBy: { createdAt: 'asc' },
      });
      return items.map((i) => ({ ...i, journeyId, vmSidenote: i.vmSidenote ?? null }));
    }
    if (ercType === 'resolution') {
      const items = await this.prisma.journeyResolution.findMany({
        where: { journeyId },
        select: {
          id: true,
          ...common,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
          poolResolutionId: true,
          ...this.sidenoteRelationSelect,
        },
        orderBy: { createdAt: 'asc' },
      });
      return items.map((i) => ({ ...i, journeyId, vmSidenote: i.vmSidenote ?? null }));
    }
    const items = await this.prisma.journeyChallenge.findMany({
      where: { journeyId },
      select: {
        id: true,
        ...common,
        durationDays: true,
        poolChallengeId: true,
        ...this.sidenoteRelationSelect,
      },
      orderBy: { createdAt: 'asc' },
    });
    return items.map((i) => ({ ...i, journeyId, vmSidenote: i.vmSidenote ?? null }));
  }

  async findById(id: string, ercType: ErcType): Promise<JourneyErcItem | null> {
    const common = {
      journeyId: true,
      status: true,
      isDeactivated: true,
      isCustom: true,
      titleEn: true,
      titleMr: true,
      descriptionEn: true,
      descriptionMr: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      createdById: true,
      reviewStatus: true,
    };
    if (ercType === 'exposure') {
      const item = await this.prisma.journeyExposure.findUnique({
        where: { id },
        select: {
          id: true,
          ...common,
          tier: true,
          poolExposureId: true,
          ...this.sidenoteRelationSelect,
        },
      });
      return item ? { ...item, vmSidenote: item.vmSidenote ?? null } : null;
    }
    if (ercType === 'resolution') {
      const item = await this.prisma.journeyResolution.findUnique({
        where: { id },
        select: {
          id: true,
          ...common,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
          poolResolutionId: true,
          ...this.sidenoteRelationSelect,
        },
      });
      return item ? { ...item, vmSidenote: item.vmSidenote ?? null } : null;
    }
    const item = await this.prisma.journeyChallenge.findUnique({
      where: { id },
      select: {
        id: true,
        ...common,
        durationDays: true,
        poolChallengeId: true,
        ...this.sidenoteRelationSelect,
      },
    });
    return item ? { ...item, vmSidenote: item.vmSidenote ?? null } : null;
  }

  async findByPoolItemId(
    journeyId: string,
    poolItemId: string,
    ercType: ErcType,
  ): Promise<{ id: string } | null> {
    if (ercType === 'exposure') {
      return this.prisma.journeyExposure.findFirst({
        where: { journeyId, poolExposureId: poolItemId },
        select: { id: true },
      });
    }
    if (ercType === 'resolution') {
      return this.prisma.journeyResolution.findFirst({
        where: { journeyId, poolResolutionId: poolItemId },
        select: { id: true },
      });
    }
    return this.prisma.journeyChallenge.findFirst({
      where: { journeyId, poolChallengeId: poolItemId },
      select: { id: true },
    });
  }

  async selectPoolItem(
    journeyId: string,
    poolItemId: string,
    ercType: ErcType,
  ): Promise<JourneyErcItem> {
    if (ercType === 'exposure') {
      const pool = await this.prisma.exposure.findUnique({
        where: { id: poolItemId },
        select: {
          titleEn: true,
          titleMr: true,
          descriptionEn: true,
          descriptionMr: true,
          tier: true,
        },
      });
      if (!pool) throw new EntityNotFoundException('Exposure', poolItemId);
      const item = await this.prisma.journeyExposure.create({
        data: {
          journeyId,
          poolExposureId: poolItemId,
          titleEn: pool.titleEn,
          titleMr: pool.titleMr,
          descriptionEn: pool.descriptionEn,
          descriptionMr: pool.descriptionMr,
          tier: pool.tier,
        },
        select: {
          id: true,
          journeyId: true,
          status: true,
          isDeactivated: true,
          isCustom: true,
          titleEn: true,
          titleMr: true,
          descriptionEn: true,
          descriptionMr: true,
          tier: true,
          startedAt: true,
          submittedAt: true,
          approvedAt: true,
          createdById: true,
          reviewStatus: true,
          poolExposureId: true,
        },
      });
      return item;
    }
    if (ercType === 'resolution') {
      const pool = await this.prisma.resolution.findUnique({
        where: { id: poolItemId },
        select: {
          titleEn: true,
          titleMr: true,
          descriptionEn: true,
          descriptionMr: true,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
        },
      });
      if (!pool) throw new EntityNotFoundException('Resolution', poolItemId);
      const item = await this.prisma.journeyResolution.create({
        data: {
          journeyId,
          poolResolutionId: poolItemId,
          titleEn: pool.titleEn,
          titleMr: pool.titleMr,
          descriptionEn: pool.descriptionEn,
          descriptionMr: pool.descriptionMr,
          durationWeeks: pool.durationWeeks,
          frequencyPerWeek: pool.frequencyPerWeek,
          frequencyLabel: pool.frequencyLabel,
        },
        select: {
          id: true,
          journeyId: true,
          status: true,
          isDeactivated: true,
          isCustom: true,
          titleEn: true,
          titleMr: true,
          descriptionEn: true,
          descriptionMr: true,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
          startedAt: true,
          submittedAt: true,
          approvedAt: true,
          createdById: true,
          reviewStatus: true,
          poolResolutionId: true,
        },
      });
      return item;
    }
    const pool = await this.prisma.challenge.findUnique({
      where: { id: poolItemId },
      select: {
        titleEn: true,
        titleMr: true,
        descriptionEn: true,
        descriptionMr: true,
        durationDays: true,
      },
    });
    if (!pool) throw new EntityNotFoundException('Challenge', poolItemId);
    const item = await this.prisma.journeyChallenge.create({
      data: {
        journeyId,
        poolChallengeId: poolItemId,
        titleEn: pool.titleEn,
        titleMr: pool.titleMr,
        descriptionEn: pool.descriptionEn,
        descriptionMr: pool.descriptionMr,
        durationDays: pool.durationDays,
      },
      select: {
        id: true,
        journeyId: true,
        status: true,
        isDeactivated: true,
        isCustom: true,
        titleEn: true,
        titleMr: true,
        descriptionEn: true,
        descriptionMr: true,
        durationDays: true,
        startedAt: true,
        submittedAt: true,
        approvedAt: true,
        createdById: true,
        reviewStatus: true,
        poolChallengeId: true,
      },
    });
    return item;
  }

  async updateStatus(id: string, status: ErcStatus, ercType: ErcType): Promise<JourneyErcItem> {
    const now = new Date();
    const timestamps: Record<string, Date | null> = {};
    if (status === ErcStatus.IN_PROGRESS) timestamps.startedAt = now;
    if (status === ErcStatus.SUBMITTED) timestamps.submittedAt = now;
    if (status === ErcStatus.APPROVED) timestamps.approvedAt = now;

    const common = {
      journeyId: true,
      status: true,
      isDeactivated: true,
      isCustom: true,
      titleEn: true,
      titleMr: true,
      descriptionEn: true,
      descriptionMr: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      createdById: true,
      reviewStatus: true,
    };
    if (ercType === 'exposure') {
      const item = await this.prisma.journeyExposure.update({
        where: { id },
        data: { status, ...timestamps },
        select: { id: true, ...common, tier: true, poolExposureId: true },
      });
      return item;
    }
    if (ercType === 'resolution') {
      const item = await this.prisma.journeyResolution.update({
        where: { id },
        data: { status, ...timestamps },
        select: {
          id: true,
          ...common,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
          poolResolutionId: true,
        },
      });
      return item;
    }
    const item = await this.prisma.journeyChallenge.update({
      where: { id },
      data: { status, ...timestamps },
      select: { id: true, ...common, durationDays: true, poolChallengeId: true },
    });
    return item;
  }

  async setDeactivated(
    id: string,
    isDeactivated: boolean,
    ercType: ErcType,
  ): Promise<JourneyErcItem> {
    const common = {
      journeyId: true,
      status: true,
      isDeactivated: true,
      isCustom: true,
      titleEn: true,
      titleMr: true,
      descriptionEn: true,
      descriptionMr: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      createdById: true,
      reviewStatus: true,
    };
    if (ercType === 'exposure')
      return this.prisma.journeyExposure.update({
        where: { id },
        data: { isDeactivated },
        select: { id: true, ...common, tier: true, poolExposureId: true },
      });
    if (ercType === 'resolution')
      return this.prisma.journeyResolution.update({
        where: { id },
        data: { isDeactivated },
        select: {
          id: true,
          ...common,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
          poolResolutionId: true,
        },
      });
    return this.prisma.journeyChallenge.update({
      where: { id },
      data: { isDeactivated },
      select: { id: true, ...common, durationDays: true, poolChallengeId: true },
    });
  }

  async remove(id: string, ercType: ErcType): Promise<void> {
    if (ercType === 'exposure') {
      await this.prisma.journeyExposure.delete({ where: { id } });
      return;
    }
    if (ercType === 'resolution') {
      await this.prisma.journeyResolution.delete({ where: { id } });
      return;
    }
    await this.prisma.journeyChallenge.delete({ where: { id } });
  }

  // ─── Custom ERC CRUD ──────────────────────────────────────────────────────

  async createCustomItem(
    journeyId: string,
    createdById: string,
    data: {
      titleEn: string;
      descriptionEn?: string;
      tier?: ExposureTier;
      durationWeeks?: number;
      frequencyPerWeek?: number;
      frequencyLabel?: string;
      durationDays?: number;
    },
    ercType: ErcType,
  ): Promise<JourneyErcItem> {
    const common = {
      journeyId: true,
      status: true,
      isDeactivated: true,
      isCustom: true,
      titleEn: true,
      titleMr: true,
      descriptionEn: true,
      descriptionMr: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      createdById: true,
      reviewStatus: true,
    };
    if (ercType === 'exposure') {
      return this.prisma.journeyExposure.create({
        data: {
          journeyId,
          createdById,
          isCustom: true,
          titleEn: data.titleEn,
          descriptionEn: data.descriptionEn,
          tier: data.tier!,
        },
        select: { id: true, ...common, tier: true, poolExposureId: true },
      });
    }
    if (ercType === 'resolution') {
      return this.prisma.journeyResolution.create({
        data: {
          journeyId,
          createdById,
          isCustom: true,
          titleEn: data.titleEn,
          descriptionEn: data.descriptionEn,
          durationWeeks: data.durationWeeks,
          frequencyPerWeek: data.frequencyPerWeek,
          frequencyLabel: data.frequencyLabel,
        },
        select: {
          id: true,
          ...common,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
          poolResolutionId: true,
        },
      });
    }
    return this.prisma.journeyChallenge.create({
      data: {
        journeyId,
        createdById,
        isCustom: true,
        titleEn: data.titleEn,
        descriptionEn: data.descriptionEn,
        durationDays: data.durationDays,
      },
      select: { id: true, ...common, durationDays: true, poolChallengeId: true },
    });
  }

  async updateCustomItem(
    id: string,
    data: {
      titleEn?: string;
      descriptionEn?: string;
      tier?: ExposureTier;
      durationWeeks?: number;
      frequencyPerWeek?: number;
      frequencyLabel?: string;
      durationDays?: number;
    },
    ercType: ErcType,
  ): Promise<JourneyErcItem> {
    const common = {
      journeyId: true,
      status: true,
      isDeactivated: true,
      isCustom: true,
      titleEn: true,
      titleMr: true,
      descriptionEn: true,
      descriptionMr: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      createdById: true,
      reviewStatus: true,
    };
    if (ercType === 'exposure') {
      return this.prisma.journeyExposure.update({
        where: { id },
        data: { titleEn: data.titleEn, descriptionEn: data.descriptionEn, tier: data.tier },
        select: { id: true, ...common, tier: true, poolExposureId: true },
      });
    }
    if (ercType === 'resolution') {
      return this.prisma.journeyResolution.update({
        where: { id },
        data: {
          titleEn: data.titleEn,
          descriptionEn: data.descriptionEn,
          durationWeeks: data.durationWeeks,
          frequencyPerWeek: data.frequencyPerWeek,
          frequencyLabel: data.frequencyLabel,
        },
        select: {
          id: true,
          ...common,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
          poolResolutionId: true,
        },
      });
    }
    return this.prisma.journeyChallenge.update({
      where: { id },
      data: {
        titleEn: data.titleEn,
        descriptionEn: data.descriptionEn,
        durationDays: data.durationDays,
      },
      select: { id: true, ...common, durationDays: true, poolChallengeId: true },
    });
  }

  async setReviewStatus(
    id: string,
    reviewStatus: string,
    ercType: ErcType,
  ): Promise<JourneyErcItem> {
    const common = {
      journeyId: true,
      status: true,
      isDeactivated: true,
      isCustom: true,
      titleEn: true,
      titleMr: true,
      descriptionEn: true,
      descriptionMr: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      createdById: true,
      reviewStatus: true,
    };
    if (ercType === 'exposure') {
      return this.prisma.journeyExposure.update({
        where: { id },
        data: { reviewStatus },
        select: { id: true, ...common, tier: true, poolExposureId: true },
      });
    }
    if (ercType === 'resolution') {
      return this.prisma.journeyResolution.update({
        where: { id },
        data: { reviewStatus },
        select: {
          id: true,
          ...common,
          durationWeeks: true,
          frequencyPerWeek: true,
          frequencyLabel: true,
          poolResolutionId: true,
        },
      });
    }
    return this.prisma.journeyChallenge.update({
      where: { id },
      data: { reviewStatus },
      select: { id: true, ...common, durationDays: true, poolChallengeId: true },
    });
  }

  // ─── VM sidenote CRUD ──────────────────────────────────────────────────────

  private sidenoteSelect = {
    id: true,
    vmId: true,
    text: true,
    acknowledgedAt: true,
    createdAt: true,
  } as const;
  private sidenoteRelationSelect = {
    vmSidenote: {
      select: { id: true, vmId: true, text: true, acknowledgedAt: true, createdAt: true },
      where: { revokedAt: null },
    },
  } as const;

  ercTypeToEntityType(ercType: ErcType): ErcEntityType {
    if (ercType === 'exposure') return ErcEntityType.EXPOSURE;
    if (ercType === 'resolution') return ErcEntityType.RESOLUTION;
    return ErcEntityType.CHALLENGE;
  }

  private itemFk(itemId: string, ercType: ErcType) {
    if (ercType === 'exposure') return { journeyExposureId: itemId };
    if (ercType === 'resolution') return { journeyResolutionId: itemId };
    return { journeyChallengeId: itemId };
  }

  async upsertSidenote(
    itemId: string,
    vmId: string,
    text: string,
    ercType: ErcType,
  ): Promise<VmSidenoteSlim> {
    const fk = this.itemFk(itemId, ercType);
    const entityType = this.ercTypeToEntityType(ercType);
    return this.prisma.vmSidenote.upsert({
      where: fk,
      update: { vmId, text, revokedAt: null, acknowledgedAt: null },
      create: { vmId, entityType, text, ...fk },
      select: this.sidenoteSelect,
    });
  }

  async revokeSidenote(itemId: string, ercType: ErcType): Promise<VmSidenoteSlim | null> {
    const existing = await this.prisma.vmSidenote.findFirst({
      where: { ...this.itemFk(itemId, ercType), revokedAt: null },
      select: { id: true },
    });
    if (!existing) return null;
    return this.prisma.vmSidenote.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), acknowledgedAt: null },
      select: this.sidenoteSelect,
    });
  }

  async acknowledgeSidenote(itemId: string, ercType: ErcType): Promise<VmSidenoteSlim | null> {
    const existing = await this.prisma.vmSidenote.findFirst({
      where: { ...this.itemFk(itemId, ercType), revokedAt: null },
      select: { id: true },
    });
    if (!existing) return null;
    return this.prisma.vmSidenote.update({
      where: { id: existing.id },
      data: { acknowledgedAt: new Date() },
      select: this.sidenoteSelect,
    });
  }
}
