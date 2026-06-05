import { Module } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsCron } from './notifications.cron';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService, NotificationsCron],
  exports: [NotificationsRepository, NotificationsService],
})
export class NotificationsModule {}
