import { Injectable } from '@nestjs/common';
import { ExperienceVisibility, Prisma, TagEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TiptapDoc } from '../../common/tiptap/sanitize';

export type ExperienceTagInput = { entityType: TagEntityType; entityId: string };

const AUTHOR_SELECT = {
  select: { id: true, displayName: true, username: true, avatarUrl: true },
} as const;

const LOG_SELECT = {
  id: true,
  authorId: true,
  journeyId: true,
  body: true,
  visibility: true,
  isDraft: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: AUTHOR_SELECT,
  tags: { select: { id: true, entityType: true, entityId: true } },
} as const;

@Injectable()
export class ExperienceLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    authorId: string;
    journeyId: string | null;
    body: TiptapDoc;
    tags: ExperienceTagInput[];
  }) {
    return this.prisma.experienceLog.create({
      data: {
        authorId: params.authorId,
        journeyId: params.journeyId,
        body: params.body as unknown as Prisma.InputJsonValue,
        visibility: ExperienceVisibility.ONLY_ME,
        isDraft: true,
        tags: params.tags.length
          ? { create: params.tags.map((t) => ({ entityType: t.entityType, entityId: t.entityId })) }
          : undefined,
      },
      select: LOG_SELECT,
    });
  }

  // The permission-slim shape — minimal fields needed to authorize view/edit/delete.
  async findSlim(id: string) {
    return this.prisma.experienceLog.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, authorId: true, journeyId: true, visibility: true, isDraft: true },
    });
  }

  async findById(id: string) {
    return this.prisma.experienceLog.findFirst({
      where: { id, deletedAt: null },
      select: LOG_SELECT,
    });
  }

  async update(
    id: string,
    data: {
      body?: TiptapDoc;
      visibility?: ExperienceVisibility;
      isDraft?: boolean;
      publishedAt?: Date;
      tags?: ExperienceTagInput[];
    },
  ) {
    // Replace the tag set in the same transaction as the entry update.
    return this.prisma.$transaction(async (tx) => {
      if (data.tags) {
        await tx.experienceLogTag.deleteMany({ where: { experienceLogId: id } });
      }
      return tx.experienceLog.update({
        where: { id },
        data: {
          ...(data.body !== undefined ? { body: data.body as unknown as Prisma.InputJsonValue } : {}),
          ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
          ...(data.isDraft !== undefined ? { isDraft: data.isDraft } : {}),
          ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt } : {}),
          ...(data.tags
            ? { tags: { create: data.tags.map((t) => ({ entityType: t.entityType, entityId: t.entityId })) } }
            : {}),
        },
        select: LOG_SELECT,
      });
    });
  }

  async softDelete(id: string) {
    return this.prisma.experienceLog.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  async findOwn(authorId: string, cursor?: string) {
    const items = await this.prisma.experienceLog.findMany({
      where: { authorId, deletedAt: null },
      select: LOG_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const nextCursor = items.length === 20 ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async findPublicPool(cursor?: string) {
    const items = await this.prisma.experienceLog.findMany({
      where: { visibility: ExperienceVisibility.PUBLIC, isDraft: false, deletedAt: null },
      select: LOG_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const nextCursor = items.length === 20 ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async findPublicByAuthor(authorId: string, cursor?: string) {
    const items = await this.prisma.experienceLog.findMany({
      where: { authorId, visibility: ExperienceVisibility.PUBLIC, isDraft: false, deletedAt: null },
      select: LOG_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const nextCursor = items.length === 20 ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }
}
