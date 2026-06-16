import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ModerationRepository } from './moderation.repository';
import { AuthModule } from '../auth/auth.module';
import { ErcModule } from '../erc/erc.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, ErcModule, NotificationsModule],
  controllers: [ModerationController],
  providers: [ModerationService, ModerationRepository],
})
export class ModerationModule {}
