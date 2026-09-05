import { Module, forwardRef } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsResolverController } from './uploads-resolver.controller';
import { UploadsService } from './uploads.service';
import { UploadsResolverService } from './uploads-resolver.service';
import { UploadsRepository } from './uploads.repository';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { ExperienceLogsModule } from '../experience-logs/experience-logs.module';

/**
 * `forwardRef` because the dependency genuinely runs both ways, and neither direction is
 * incidental: saving a log binds its images (experience-logs → uploads), and serving an image
 * asks the log whether the viewer may see it (uploads → experience-logs). That second direction
 * is the whole point — it is what stops image visibility becoming a second, drifting copy of the
 * log's own rules.
 */
@Module({
  imports: [AuthModule, StorageModule, forwardRef(() => ExperienceLogsModule)],
  controllers: [UploadsController, UploadsResolverController],
  providers: [UploadsService, UploadsResolverService, UploadsRepository],
  exports: [UploadsService],
})
export class UploadsModule {}
