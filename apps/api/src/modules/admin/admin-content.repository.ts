import { Injectable } from '@nestjs/common';
import { Prisma, ResourceType, TagEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TiptapDoc } from '../../common/tiptap/sanitize';

type FormalTag = { entityType: TagEntityType; entityId: string };

const SHLOKA_INDEX_SELECT = {
  id: true,
  devanagariText: true,
  transliteration: true,
  meaningEn: true,
  meaningMr: true,
  looseTags: true,
} as const;

@Injectable()
export class AdminContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Virtues ───────────────────────────────────────────────────────────────
  createVirtue(data: { nameEn: string; nameMr?: string; description?: string }) {
    return this.prisma.virtue.create({ data });
  }

  updateVirtue(id: string, data: { nameEn?: string; nameMr?: string; description?: string }) {
    return this.prisma.virtue.update({ where: { id }, data });
  }

  findVirtue(id: string) {
    return this.prisma.virtue.findUnique({
      where: { id },
      include: { _count: { select: { subvirtues: true } } },
    });
  }

  deleteVirtue(id: string) {
    return this.prisma.virtue.delete({ where: { id }, select: { id: true } });
  }

  // ─── Subvirtues ──────────────────────────────────────────────────────────────
  createSubvirtue(data: {
    virtueId: string;
    nameEn: string;
    nameMr?: string;
    description?: string;
  }) {
    return this.prisma.subvirtue.create({ data });
  }

  updateSubvirtue(
    id: string,
    data: { virtueId?: string; nameEn?: string; nameMr?: string; description?: string },
  ) {
    return this.prisma.subvirtue.update({ where: { id }, data });
  }

  findSubvirtue(id: string) {
    return this.prisma.subvirtue.findUnique({
      where: { id },
      include: { _count: { select: { sentences: true, weaknesses: true } } },
    });
  }

  deleteSubvirtue(id: string) {
    return this.prisma.subvirtue.delete({ where: { id }, select: { id: true } });
  }

  // ─── Weaknesses ──────────────────────────────────────────────────────────────
  createWeakness(data: {
    nameEn: string;
    nameMr?: string;
    description?: string;
    category?: string;
  }) {
    return this.prisma.weakness.create({ data });
  }

  updateWeakness(
    id: string,
    data: { nameEn?: string; nameMr?: string; description?: string; category?: string },
  ) {
    return this.prisma.weakness.update({ where: { id }, data });
  }

  findWeakness(id: string) {
    return this.prisma.weakness.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            journeyWeaknesses: true,
            exposureWeaknesses: true,
            resolutionWeaknesses: true,
            challengeWeaknesses: true,
            testAttempts: true,
          },
        },
      },
    });
  }

  deleteWeakness(id: string) {
    return this.prisma.weakness.delete({ where: { id }, select: { id: true } });
  }

  // ─── Weakness ↔ Subvirtue links ───────────────────────────────────────────────
  upsertWeaknessSubvirtue(weaknessId: string, subvirtueId: string, priority: number) {
    return this.prisma.weaknessSubvirtue.upsert({
      where: { weaknessId_subvirtueId: { weaknessId, subvirtueId } },
      create: { weaknessId, subvirtueId, priority },
      update: { priority },
    });
  }

  deleteWeaknessSubvirtue(weaknessId: string, subvirtueId: string) {
    return this.prisma.weaknessSubvirtue.delete({
      where: { weaknessId_subvirtueId: { weaknessId, subvirtueId } },
    });
  }

  // ─── Shlokas ─────────────────────────────────────────────────────────────────
  createShloka(data: {
    devanagariText: string;
    transliteration?: string;
    meaningEn?: string;
    meaningMr?: string;
    sourceCitation?: string;
    looseTags: string[];
    formalTags: FormalTag[];
  }) {
    const { formalTags, ...rest } = data;
    return this.prisma.shloka.create({
      data: { ...rest, formalTags: { create: formalTags } },
      select: SHLOKA_INDEX_SELECT,
    });
  }

  async updateShloka(
    id: string,
    data: {
      devanagariText?: string;
      transliteration?: string;
      meaningEn?: string;
      meaningMr?: string;
      sourceCitation?: string;
      looseTags?: string[];
      formalTags?: FormalTag[];
    },
  ) {
    const { formalTags, ...rest } = data;
    return this.prisma.$transaction(async (tx) => {
      if (formalTags !== undefined) {
        await tx.shlokaTag.deleteMany({ where: { shlokaId: id } });
        if (formalTags.length > 0) {
          await tx.shlokaTag.createMany({ data: formalTags.map((t) => ({ ...t, shlokaId: id })) });
        }
      }
      return tx.shloka.update({ where: { id }, data: rest, select: SHLOKA_INDEX_SELECT });
    });
  }

  findShloka(id: string) {
    return this.prisma.shloka.findUnique({ where: { id }, select: { id: true } });
  }

  deleteShloka(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.shlokaSchedule.deleteMany({ where: { shlokaId: id } });
      await tx.shlokaQueueItem.deleteMany({ where: { shlokaId: id } });
      await tx.pothiSectionShloka.deleteMany({ where: { shlokaId: id } });
      return tx.shloka.delete({ where: { id }, select: { id: true } });
    });
  }

  // ─── Scheduling ────────────────────────────────────────────────────────────────
  upsertSchedule(scheduledDate: Date, shlokaId: string) {
    return this.prisma.shlokaSchedule.upsert({
      where: { scheduledDate },
      create: { scheduledDate, shlokaId },
      update: { shlokaId },
    });
  }

  deleteSchedule(scheduledDate: Date) {
    return this.prisma.shlokaSchedule.deleteMany({ where: { scheduledDate } });
  }

  listSchedule(from: Date, to: Date) {
    return this.prisma.shlokaSchedule.findMany({
      where: { scheduledDate: { gte: from, lte: to } },
      orderBy: { scheduledDate: 'asc' },
      select: { id: true, scheduledDate: true, shloka: { select: SHLOKA_INDEX_SELECT } },
    });
  }

  // ─── Queue ───────────────────────────────────────────────────────────────────
  listQueue() {
    return this.prisma.shlokaQueueItem.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, position: true, shloka: { select: SHLOKA_INDEX_SELECT } },
    });
  }

  replaceQueue(shlokaIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.shlokaQueueItem.deleteMany({});
      if (shlokaIds.length > 0) {
        await tx.shlokaQueueItem.createMany({
          data: shlokaIds.map((shlokaId, position) => ({ shlokaId, position })),
        });
      }
    });
  }

  countShlokasByIds(ids: string[]) {
    return this.prisma.shloka.count({ where: { id: { in: ids } } });
  }

  // ─── Pothi sections ────────────────────────────────────────────────────────────
  createPothiSection(
    data: {
      sectionNumber: number;
      titleEn: string;
      titleMr?: string;
      introText?: string;
      congregationResponse?: string;
      postShlokaCommentary?: string;
    },
    shlokaIds: string[],
  ) {
    return this.prisma.pothiSection.create({
      data: {
        ...data,
        shlokas: { create: shlokaIds.map((shlokaId, sortOrder) => ({ shlokaId, sortOrder })) },
      },
      select: { id: true },
    });
  }

  updatePothiSection(
    id: string,
    data: {
      sectionNumber?: number;
      titleEn?: string;
      titleMr?: string;
      introText?: string;
      congregationResponse?: string;
      postShlokaCommentary?: string;
    },
    shlokaIds?: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (shlokaIds !== undefined) {
        await tx.pothiSectionShloka.deleteMany({ where: { pothiSectionId: id } });
        if (shlokaIds.length > 0) {
          await tx.pothiSectionShloka.createMany({
            data: shlokaIds.map((shlokaId, sortOrder) => ({
              pothiSectionId: id,
              shlokaId,
              sortOrder,
            })),
          });
        }
      }
      return tx.pothiSection.update({ where: { id }, data, select: { id: true } });
    });
  }

  findPothiSection(id: string) {
    return this.prisma.pothiSection.findUnique({ where: { id }, select: { id: true } });
  }

  deletePothiSection(id: string) {
    return this.prisma.pothiSection.delete({ where: { id }, select: { id: true } });
  }

  // ─── Resources ───────────────────────────────────────────────────────────────
  createResource(
    data: {
      type: ResourceType;
      url?: string;
      filePath?: string;
      thumbnailUrl?: string;
      title: string;
      oneLiner?: string;
      description?: TiptapDoc;
      looseTags: string[];
      createdById: string;
    },
    formalTags: FormalTag[],
  ) {
    const { description, ...rest } = data;
    return this.prisma.resource.create({
      data: {
        ...rest,
        ...(description !== undefined
          ? { description: description as unknown as Prisma.InputJsonValue }
          : {}),
        formalTags: { create: formalTags },
      },
      select: { id: true },
    });
  }

  updateResource(
    id: string,
    data: {
      type?: ResourceType;
      url?: string;
      filePath?: string;
      thumbnailUrl?: string;
      title?: string;
      oneLiner?: string;
      description?: TiptapDoc;
      looseTags?: string[];
    },
    formalTags?: FormalTag[],
  ) {
    const { description, ...rest } = data;
    return this.prisma.$transaction(async (tx) => {
      if (formalTags !== undefined) {
        await tx.resourceTag.deleteMany({ where: { resourceId: id } });
        if (formalTags.length > 0) {
          await tx.resourceTag.createMany({
            data: formalTags.map((t) => ({ ...t, resourceId: id })),
          });
        }
      }
      return tx.resource.update({
        where: { id },
        data: {
          ...rest,
          ...(description !== undefined
            ? { description: description as unknown as Prisma.InputJsonValue }
            : {}),
        },
        select: { id: true },
      });
    });
  }

  findResource(id: string) {
    return this.prisma.resource.findUnique({ where: { id }, select: { id: true } });
  }

  deleteResource(id: string) {
    return this.prisma.resource.delete({ where: { id }, select: { id: true } });
  }
}
