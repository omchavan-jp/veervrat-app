import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentOverridesController } from './content-overrides.controller';
import { ContentOverridesService } from './content-overrides.service';
import { ContentOverridesRepository } from './content-overrides.repository';
import { GithubPublisher } from './github-publisher';

@Module({
  imports: [AuthModule],
  controllers: [ContentOverridesController],
  providers: [ContentOverridesService, ContentOverridesRepository, GithubPublisher],
})
export class ContentOverridesModule {}
