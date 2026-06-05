import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
}
