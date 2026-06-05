import { Module } from '@nestjs/common';
import { ExposuresController, ResolutionsController, ChallengesController } from './erc.controller';
import { ErcService } from './erc.service';
import { ErcRepository } from './erc.repository';
import { AuthModule } from '../auth/auth.module';
import { JourneysModule } from '../journeys/journeys.module';

@Module({
  imports: [AuthModule, JourneysModule],
  controllers: [ExposuresController, ResolutionsController, ChallengesController],
  providers: [ErcService, ErcRepository],
  exports: [ErcService],
})
export class ErcModule {}
