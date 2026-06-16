import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditWrite = {
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
};

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(event: AuditWrite) {
    return this.prisma.auditEvent.create({
      data: {
        actorId: event.actorId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        metadata: (event.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
    });
  }

  // Admin-queryable, cursor-paginated, most-recent first. Optional action/actor filters.
  async list(params: { cursor?: string; action?: string; actorId?: string; take?: number }) {
    const take = params.take ?? 50;
    const items = await this.prisma.auditEvent.findMany({
      where: {
        ...(params.action ? { action: params.action } : {}),
        ...(params.actorId ? { actorId: params.actorId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }
}
