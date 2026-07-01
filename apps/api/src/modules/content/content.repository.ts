import { Injectable } from '@nestjs/common';
import { ResourceType, TagEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SHLOKA_SELECT = {
  id: true,
  devanagariText: true,
  transliteration: true,
  meaningEn: true,
  meaningMr: true,
  sourceCitation: true,
  looseTags: true,
} as const;

export type ResolvedTag = { entityType: TagEntityType; entityId: string; name: string | null };

@Injectable()
export class ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Pothi ───────────────────────────────────────────────────────────────────

  async listPothiSections() {
    const sections = await this.prisma.pothiSection.findMany({
      orderBy: { sectionNumber: 'asc' },
      select: {
        id: true,
        sectionNumber: true,
        titleEn: true,
        titleMr: true,
        introText: true,
        congregationResponse: true,
        postShlokaCommentary: true,
        shlokas: {
          orderBy: { sortOrder: 'asc' },
          select: { shloka: { select: SHLOKA_SELECT } },
        },
      },
    });
    return sections.map((s) => ({ ...s, shlokas: s.shlokas.map((x) => x.shloka) }));
  }

  // ─── Shlokas ───────────────────────────────────────────────────────────────────

  async listShlokas(params: { source?: string; cursor?: string; take?: number }) {
    const take = params.take ?? 24;
    const items = await this.prisma.shloka.findMany({
      where: params.source
        ? { sourceCitation: { contains: params.source, mode: 'insensitive' } }
        : {},
      select: SHLOKA_SELECT,
      orderBy: { createdAt: 'asc' },
      take,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async findShlokasByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.prisma.shloka.findMany({
      where: { id: { in: ids } },
      select: SHLOKA_SELECT,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => !!s);
  }

  async findShlokaDetail(id: string) {
    const shloka = await this.prisma.shloka.findUnique({
      where: { id },
      select: {
        ...SHLOKA_SELECT,
        formalTags: { select: { entityType: true, entityId: true } },
      },
    });
    if (!shloka) return null;
    const formalTags = await this.resolveTags(shloka.formalTags);
    return { ...shloka, formalTags };
  }

  async allShlokasForIndex() {
    return this.prisma.shloka.findMany({ select: SHLOKA_SELECT });
  }

  // ─── Shloka of the day ─────────────────────────────────────────────────────────

  async findScheduledShloka(date: Date) {
    const row = await this.prisma.shlokaSchedule.findUnique({
      where: { scheduledDate: date },
      select: { shloka: { select: SHLOKA_SELECT } },
    });
    return row?.shloka ?? null;
  }

  async pickFromQueue(dayIndex: number) {
    const queue = await this.prisma.shlokaQueueItem.findMany({
      orderBy: { position: 'asc' },
      select: { shloka: { select: SHLOKA_SELECT } },
    });
    if (queue.length === 0) return null;
    return queue[((dayIndex % queue.length) + queue.length) % queue.length].shloka;
  }

  // ─── Resources ─────────────────────────────────────────────────────────────────

  async listResources(params: { type?: ResourceType; cursor?: string; take?: number }) {
    const take = params.take ?? 24;
    const items = await this.prisma.resource.findMany({
      where: params.type ? { type: params.type } : {},
      select: {
        id: true,
        type: true,
        url: true,
        thumbnailUrl: true,
        title: true,
        oneLiner: true,
        looseTags: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async findResourceDetail(id: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        url: true,
        filePath: true,
        thumbnailUrl: true,
        title: true,
        oneLiner: true,
        description: true,
        looseTags: true,
        formalTags: { select: { entityType: true, entityId: true } },
      },
    });
    if (!resource) return null;
    const formalTags = await this.resolveTags(resource.formalTags);
    return { ...resource, formalTags };
  }

  // ─── Tag resolution ──────────────────────────────────────────────────────────
  // Resolve formal entity tags to display names so the client renders chips directly.
  private async resolveTags(
    tags: { entityType: TagEntityType; entityId: string }[],
  ): Promise<ResolvedTag[]> {
    if (tags.length === 0) return [];
    const byType = <T extends TagEntityType>(t: T) =>
      tags.filter((x) => x.entityType === t).map((x) => x.entityId);

    const [virtues, subvirtues, weaknesses, sentences] = await Promise.all([
      this.prisma.virtue.findMany({
        where: { id: { in: byType(TagEntityType.VIRTUE) } },
        select: { id: true, nameEn: true },
      }),
      this.prisma.subvirtue.findMany({
        where: { id: { in: byType(TagEntityType.SUBVIRTUE) } },
        select: { id: true, nameEn: true },
      }),
      this.prisma.weakness.findMany({
        where: { id: { in: byType(TagEntityType.WEAKNESS) } },
        select: { id: true, nameEn: true },
      }),
      this.prisma.sentence.findMany({
        where: { id: { in: byType(TagEntityType.SENTENCE) } },
        select: { id: true, textEn: true },
      }),
    ]);
    const names = new Map<string, string>();
    virtues.forEach((v) => names.set(v.id, v.nameEn));
    subvirtues.forEach((v) => names.set(v.id, v.nameEn));
    weaknesses.forEach((v) => names.set(v.id, v.nameEn));
    sentences.forEach((v) => names.set(v.id, v.textEn));

    return tags.map((t) => ({
      entityType: t.entityType,
      entityId: t.entityId,
      name: names.get(t.entityId) ?? null,
    }));
  }
}
