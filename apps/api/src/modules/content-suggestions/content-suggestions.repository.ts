import { Injectable } from '@nestjs/common';
import { Prisma, SuggestionKind, SuggestionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type SuggestionRecord = {
  id: string;
  authorId: string;
  kind: SuggestionKind;
  status: SuggestionStatus;
  route: string;
  url: string;
  entityType: string | null;
  entityId: string | null;
  locale: string;
  anchorKey: string | null;
  anchorText: string | null;
  anchorPath: string | null;
  viewport: string | null;
  titleEn: string;
  titleMr: string | null;
  bodyEn: Prisma.JsonValue | null;
  bodyMr: Prisma.JsonValue | null;
  currentText: string | null;
  resolution: string | null;
  linkedIssue: string | null;
  linkedCmsKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSuggestionInput = {
  authorId: string;
  kind: SuggestionKind;
  route: string;
  url: string;
  entityType?: string | null;
  entityId?: string | null;
  locale: string;
  anchorKey?: string | null;
  anchorText?: string | null;
  anchorPath?: string | null;
  viewport?: string | null;
  titleEn: string;
  titleMr?: string | null;
  bodyEn?: Prisma.InputJsonValue;
  bodyMr?: Prisma.InputJsonValue;
  currentText?: string | null;
};

export type TriageInput = {
  status: SuggestionStatus;
  resolution?: string | null;
  linkedIssue?: string | null;
  linkedCmsKey?: string | null;
  triagedById: string;
};

@Injectable()
export class ContentSuggestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateSuggestionInput): Promise<SuggestionRecord> {
    return this.prisma.contentSuggestion.create({ data: input });
  }

  findById(id: string): Promise<SuggestionRecord | null> {
    return this.prisma.contentSuggestion.findUnique({ where: { id } });
  }

  listForAuthor(authorId: string): Promise<SuggestionRecord[]> {
    return this.prisma.contentSuggestion.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * The author's suggestions on one page, for the in-place pins.
   *
   * Matched on the route **pattern**, not the URL: `/weaknesses/[id]` plus the entity id is what
   * identifies "this page about this thing". Matching the resolved URL would miss a suggestion
   * made when a query string differed.
   */
  listForAuthorOnRoute(
    authorId: string,
    route: string,
    entityId: string | null,
  ): Promise<SuggestionRecord[]> {
    return this.prisma.contentSuggestion.findMany({
      where: { authorId, route, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Every suggestion, whoever made it. Admin triage. */
  listAll(filter: {
    status?: SuggestionStatus;
    route?: string;
    entityType?: string;
  }): Promise<(SuggestionRecord & { author: { displayName: string; username: string } })[]> {
    return this.prisma.contentSuggestion.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.route ? { route: filter.route } : {}),
        ...(filter.entityType ? { entityType: filter.entityType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { displayName: true, username: true } } },
    });
  }

  triage(id: string, input: TriageInput): Promise<SuggestionRecord> {
    return this.prisma.contentSuggestion.update({ where: { id }, data: input });
  }
}
