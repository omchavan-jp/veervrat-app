import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type NotificationActor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type NotificationRecord = {
  id: string;
  eventType: NotificationEventType;
  resourceType: string | null;
  resourceId: string | null;
  readAt: Date | null;
  dismissedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  actor: NotificationActor | null;
};

export type NotificationPage = {
  items: NotificationRecord[];
  nextCursor: string | null;
};

const actorSelect = { select: { id: true, displayName: true, avatarUrl: true } } as const;

function buildCursor(n: NotificationRecord): string {
  return `${n.createdAt.toISOString()}:${n.id}`;
}

function parseCursor(cursor: string): { createdAt: Date; id: string } | null {
  const colonIdx = cursor.lastIndexOf(':');
  if (colonIdx === -1) return null;
  const ts = cursor.slice(0, colonIdx);
  const id = cursor.slice(colonIdx + 1);
  const date = new Date(ts);
  if (isNaN(date.getTime())) return null;
  return { createdAt: date, id };
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    recipientId: string,
    actorId: string | null,
    eventType: NotificationEventType,
    resourceType: string | null = null,
    resourceId: string | null = null,
  ) {
    return this.prisma.notification.create({
      data: { recipientId, actorId, eventType, resourceType, resourceId },
    });
  }

  async listForUser(
    userId: string,
    cursor?: string,
    pageSize: number = 20,
  ): Promise<NotificationPage> {
    const limit = Math.min(pageSize, 100);
    const parsed = cursor ? parseCursor(cursor) : null;

    const where = {
      recipientId: userId,
      archivedAt: null,
      ...(parsed
        ? {
            OR: [
              { createdAt: { lt: parsed.createdAt } },
              { createdAt: parsed.createdAt, id: { lt: parsed.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.notification.findMany({
      where,
      include: { actor: actorSelect },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: items.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        readAt: r.readAt,
        dismissedAt: r.dismissedAt,
        archivedAt: r.archivedAt,
        createdAt: r.createdAt,
        actor: r.actor
          ? { id: r.actor.id, displayName: r.actor.displayName, avatarUrl: r.actor.avatarUrl }
          : null,
      })),
      nextCursor: hasMore ? buildCursor(items[items.length - 1]) : null,
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, readAt: null, archivedAt: null },
    });
  }

  async findById(id: string): Promise<{ id: string; recipientId: string; readAt: Date | null } | null> {
    return this.prisma.notification.findUnique({
      where: { id },
      select: { id: true, recipientId: true, readAt: true },
    });
  }

  async markRead(id: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async archiveOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { createdAt: { lt: date }, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return result.count;
  }
}
