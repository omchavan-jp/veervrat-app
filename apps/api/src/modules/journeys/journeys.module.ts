import { Module } from '@nestjs/common';
import { JourneysController } from './journeys.controller';
import { JourneysService } from './journeys.service';
import { JourneysRepository } from './journeys.repository';
import { DormantJourneysCron } from './dormant-journeys.cron';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [JourneysController],
  providers: [JourneysService, JourneysRepository, DormantJourneysCron],
  exports: [JourneysService, JourneysRepository],
})
export class JourneysModule {}
