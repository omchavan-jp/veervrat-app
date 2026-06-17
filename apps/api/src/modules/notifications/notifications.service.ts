import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createElement } from 'react';
import type { NotificationEventType } from '@prisma/client';
import { NotificationsRepository, NotificationPage } from './notifications.repository';
import { AccessDeniedException, EntityNotFoundException } from '../../common/exceptions/app.exceptions';
import { EmailService } from '../email/email.service';
import { NotificationEmail, getNotificationSubject } from '../email/templates/NotificationEmail';
import { notificationLinkPath } from './notification-link';
import {
  EMAILABLE_EVENTS,
  EmailableEvent,
  isEmailEnabled,
  parseNotificationPrefs,
} from '../users/notification-prefs';

const EMAILABLE_SET = new Set<string>(EMAILABLE_EVENTS);

type CreateOptions = {
  // Skip the generic notification email — for callers (e.g. invitations) that send their own
  // richer bespoke email for the same event, to avoid a double-send.
  skipEmail?: boolean;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  async create(
    recipientId: string,
    actorId: string | null,
    eventType: NotificationEventType,
    resourceType: string | null = null,
    resourceId: string | null = null,
    options: CreateOptions = {},
  ) {
    const notification = await this.notificationsRepository.create(
      recipientId,
      actorId,
      eventType,
      resourceType,
      resourceId,
    );

    if (!options.skipEmail && EMAILABLE_SET.has(eventType)) {
      // Fire-and-forget — email is secondary and must never block or fail the action (spec/25).
      void this.sendEmail(recipientId, eventType as EmailableEvent, resourceType, resourceId);
    }

    return notification;
  }

  private async sendEmail(
    recipientId: string,
    event: EmailableEvent,
    resourceType: string | null,
    resourceId: string | null,
  ): Promise<void> {
    try {
      const recipient = await this.notificationsRepository.findEmailRecipient(recipientId);
      if (!recipient) return; // inactive (deleted/suspended) or missing

      const prefs = parseNotificationPrefs(recipient.notificationPrefs);
      if (!isEmailEnabled(prefs, event)) return; // user opted out

      const language = recipient.language === 'mr' || recipient.language === 'MR' ? 'MR' : 'EN';
      const link = `${this.frontendUrl}${notificationLinkPath(event, resourceType, resourceId)}`;
      const { html, text } = await this.emailService.renderTemplate(
        createElement(NotificationEmail, { event, language, link }),
      );
      this.emailService.sendNotification(recipient.email, getNotificationSubject(event, language), html, text);
    } catch (err) {
      this.logger.warn({ msg: 'Notification email dispatch failed', event, error: (err as Error).message });
    }
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
