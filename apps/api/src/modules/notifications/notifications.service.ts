import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';
import { NotificationsRepository, NotificationPage } from './notifications.repository';
import { AccessDeniedException, EntityNotFoundException } from '../../common/exceptions/app.exceptions';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  async create(
    recipientId: string,
    actorId: string | null,
    eventType: NotificationEventType,
    resourceType: string | null = null,
    resourceId: string | null = null,
  ) {
    return this.notificationsRepository.create(recipientId, actorId, eventType, resourceType, resourceId);
  }

  async listForUser(userId: string, cursor?: string, pageSize?: number): Promise<NotificationPage> {
    return this.notificationsRepository.listForUser(userId, cursor, pageSize);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.countUnread(userId);
  }

  async markRead(callerId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationsRepository.findById(notificationId);
    if (!notification) throw new EntityNotFoundException('Notification', notificationId);
    if (notification.recipientId !== callerId) throw new AccessDeniedException();
    await this.notificationsRepository.markRead(notificationId);
  }

  async markAllRead(userId: string): Promise<number> {
    return this.notificationsRepository.markAllRead(userId);
  }
}
