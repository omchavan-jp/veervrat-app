import { Module } from '@nestjs/common';
import { ExperienceLogsController } from './experience-logs.controller';
import { ExperienceLogsService } from './experience-logs.service';
import { ExperienceLogsRepository } from './experience-logs.repository';
import { AuthModule } from '../auth/auth.module';
import { JourneysModule } from '../journeys/journeys.module';

@Module({
  imports: [AuthModule, JourneysModule],
  controllers: [ExperienceLogsController],
  providers: [ExperienceLogsService, ExperienceLogsRepository],
})
export class ExperienceLogsModule {}
