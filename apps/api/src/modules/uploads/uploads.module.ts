import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadsRepository } from './uploads.repository';
import { storageProviderFactory } from './storage/storage-provider.factory';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService, UploadsRepository, storageProviderFactory],
  exports: [UploadsService],
})
export class UploadsModule {}
