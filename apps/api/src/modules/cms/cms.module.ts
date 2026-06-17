import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { CmsRepository } from './cms.repository';

@Module({
  imports: [AuthModule],
  controllers: [CmsController],
  providers: [CmsService, CmsRepository],
  exports: [CmsService],
})
export class CmsModule {}
