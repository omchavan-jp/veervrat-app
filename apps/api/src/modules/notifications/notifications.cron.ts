import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsRepository } from './notifications.repository';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsCron {
  private readonly logger = new Logger(NotificationsCron.name);

  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  @Cron('7 3 * * *')
  async archiveOld(): Promise<void> {
    this.logger.log('Starting notification archive job');
    try {
      const cutoff = new Date(Date.now() - NINETY_DAYS_MS);
      const count = await this.notificationsRepository.archiveOlderThan(cutoff);
      this.logger.log(`Notification archive job complete — archived ${count} notifications`);
    } catch (err) {
      this.logger.error('Notification archive job failed', err);
      throw err;
    }
  }
}
