import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationEventType } from '@prisma/client';
import { JourneysRepository } from './journeys.repository';
import { NotificationsService } from '../notifications/notifications.service';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class DormantJourneysCron {
  private readonly logger = new Logger(DormantJourneysCron.name);

  constructor(
    private readonly journeysRepository: JourneysRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Daily at 02:00 (spec/04: dormant after 30 days of no views/updates). Marks stale ACTIVE
  // journeys DORMANT and nudges the VA + each assigned journey VM (JOURNEY_DORMANT — emailable
  // per spec/25, so the notification service also sends email to non-opted-out recipients).
  @Cron('0 2 * * *')
  async detectDormant(): Promise<void> {
    this.logger.log('Starting dormant journey detection job');
    try {
      const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
      const stale = await this.journeysRepository.findStaleActiveJourneys(cutoff);
      const now = new Date();

      for (const journey of stale) {
        await this.journeysRepository.markDormant(journey.id, now);
        // System event — no actor. Notify VA and every assigned journey VM.
        const recipients = [journey.vratarthiId, ...journey.vmIds];
        for (const recipientId of recipients) {
          void this.notificationsService.create(
            recipientId,
            null,
            NotificationEventType.JOURNEY_DORMANT,
            'journey',
            journey.id,
          );
        }
      }

      this.logger.log(
        `Dormant journey detection complete — marked ${stale.length} journeys dormant`,
      );
    } catch (err) {
      this.logger.error('Dormant journey detection job failed', err);
      throw err;
    }
  }
}
