import { Module } from '@nestjs/common';
import { ExperienceLogsController } from './experience-logs.controller';
import { ExperienceLogsService } from './experience-logs.service';
import { ExperienceLogsRepository } from './experience-logs.repository';
import { AuthModule } from '../auth/auth.module';
import { JourneysModule } from '../journeys/journeys.module';
import { FollowsModule } from '../follows/follows.module';

@Module({
  imports: [AuthModule, JourneysModule, FollowsModule],
  controllers: [ExperienceLogsController],
  providers: [ExperienceLogsService, ExperienceLogsRepository],
  exports: [ExperienceLogsService],
})
export class ExperienceLogsModule {}
