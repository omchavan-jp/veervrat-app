import { Injectable } from '@nestjs/common';
import { FeedbackStatus, FeedbackType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type FeedbackReporter = {
  id: string;
  displayName: string;
};

export type FeedbackRecord = {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  title: string;
  description: string | null;
  route: string | null;
  locale: string | null;
  commitSha: string | null;
  declineReason: string | null;
  createdAt: Date;
  reporter: FeedbackReporter;
  upvoteCount: number;
  hasUpvoted: boolean;
};

export type FeedbackPage = {
  items: FeedbackRecord[];
  nextCursor: string | null;
};

export type CreateFeedbackData = {
  reporterId: string;
  reporterRole: string;
  type: FeedbackType;
  title: string;
  description?: string;
  route?: string;
  locale?: string;
  viewport?: string;
  userAgent?: string;
  commitSha?: string;
};

const reporterSelect = { select: { id: true, displayName: true } } as const;

type FeedbackRow = Prisma.FeedbackItemGetPayload<{
  include: {
    reporter: typeof reporterSelect;
    _count: { select: { upvotes: true } };
    upvotes: { select: { userId: true } };
  };
}>;

function buildCursor(item: { createdAt: Date; id: string }): string {
  return `${item.createdAt.toISOString()}:${item.id}`;
}

function parseCursor(cursor: string): { createdAt: Date; id: string } | null {
  const colonIdx = cursor.lastIndexOf(':');
  if (colonIdx === -1) return null;
  const date = new Date(cursor.slice(0, colonIdx));
  if (isNaN(date.getTime())) return null;
  return { createdAt: date, id: cursor.slice(colonIdx + 1) };
}

function toRecord(row: FeedbackRow): FeedbackRecord {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description,
    route: row.route,
    locale: row.locale,
    commitSha: row.commitSha,
    declineReason: row.declineReason,
    createdAt: row.createdAt,
    reporter: { id: row.reporter.id, displayName: row.reporter.displayName },
    upvoteCount: row._count.upvotes,
    hasUpvoted: row.upvotes.length > 0,
  };
}

@Injectable()
export class FeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // viewerId scopes the `upvotes` include so hasUpvoted reflects the requesting user.
  private includeFor(viewerId: string) {
    return {
      reporter: reporterSelect,
      _count: { select: { upvotes: true } },
      upvotes: { where: { userId: viewerId }, select: { userId: true } },
    } as const;
  }

  async create(data: CreateFeedbackData, viewerId: string): Promise<FeedbackRecord> {
    const row = await this.prisma.feedbackItem.create({
      data,
      include: this.includeFor(viewerId),
    });
    return toRecord(row);
  }

  async list(
    viewerId: string,
    includeResolved: boolean,
    cursor?: string,
    pageSize: number = 20,
  ): Promise<FeedbackPage> {
    const limit = Math.min(pageSize, 100);
    const parsed = cursor ? parseCursor(cursor) : null;

    const where: Prisma.FeedbackItemWhereInput = {
      ...(includeResolved ? {} : { status: { in: [FeedbackStatus.NEW, FeedbackStatus.TRIAGED] } }),
      ...(parsed
        ? {
            OR: [
              { createdAt: { lt: parsed.createdAt } },
              { createdAt: parsed.createdAt, id: { lt: parsed.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.feedbackItem.findMany({
      where,
      include: this.includeFor(viewerId),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: items.map(toRecord),
      nextCursor: hasMore ? buildCursor(items[items.length - 1]) : null,
    };
  }

  async findById(id: string): Promise<{ id: string; status: FeedbackStatus } | null> {
    return this.prisma.feedbackItem.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
  }

  // Returns the new upvote state (true = upvoted) plus the fresh count.
  async toggleUpvote(
    feedbackItemId: string,
    userId: string,
  ): Promise<{ hasUpvoted: boolean; upvoteCount: number }> {
    const existing = await this.prisma.feedbackUpvote.findUnique({
      where: { feedbackItemId_userId: { feedbackItemId, userId } },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.feedbackUpvote.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.feedbackUpvote.create({ data: { feedbackItemId, userId } });
    }

    const upvoteCount = await this.prisma.feedbackUpvote.count({ where: { feedbackItemId } });
    return { hasUpvoted: !existing, upvoteCount };
  }

  async updateStatus(
    id: string,
    status: FeedbackStatus,
    declineReason: string | null,
    viewerId: string,
  ): Promise<FeedbackRecord> {
    const row = await this.prisma.feedbackItem.update({
      where: { id },
      data: { status, declineReason },
      include: this.includeFor(viewerId),
    });
    return toRecord(row);
  }
}
