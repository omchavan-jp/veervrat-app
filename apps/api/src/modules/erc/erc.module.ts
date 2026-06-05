import { Module } from '@nestjs/common';
import { ExposuresController, ResolutionsController, ChallengesController } from './erc.controller';
import { ResolutionCheckinsController } from './resolution-checkins.controller';
import { ErcService } from './erc.service';
import { ErcRepository } from './erc.repository';
import { CustomErcReviewsRepository } from './custom-erc-reviews.repository';
import { ResolutionCheckinsService } from './resolution-checkins.service';
import { ResolutionCheckinsRepository } from './resolution-checkins.repository';
import { AuthModule } from '../auth/auth.module';
import { JourneysModule } from '../journeys/journeys.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, JourneysModule, NotificationsModule],
  controllers: [ExposuresController, ResolutionsController, ChallengesController, ResolutionCheckinsController],
  providers: [ErcService, ErcRepository, CustomErcReviewsRepository, ResolutionCheckinsService, ResolutionCheckinsRepository],
  exports: [ErcService],
})
export class ErcModule {}
