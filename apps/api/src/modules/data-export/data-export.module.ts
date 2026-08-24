import { Module } from '@nestjs/common';
import { DataExportService } from './data-export.service';
import { DataExportRepository } from './data-export.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [DataExportService, DataExportRepository],
  exports: [DataExportService],
})
export class DataExportModule {}
