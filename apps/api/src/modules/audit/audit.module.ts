import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { AuthModule } from '../auth/auth.module';

// Global so AuditService is injectable anywhere (auth service, future admin/mod
// services) without re-importing. The @Audited() interceptor is registered app-wide.
@Global()
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
