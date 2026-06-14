import { Module } from '@nestjs/common';
import { VmRelationshipsController } from './vm-relationships.controller';
import { VmRelationshipsService } from './vm-relationships.service';
import { VmRelationshipsRepository } from './vm-relationships.repository';
import { AuthModule } from '../auth/auth.module';
import { JourneysModule } from '../journeys/journeys.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, JourneysModule, NotificationsModule],
  controllers: [VmRelationshipsController],
  providers: [VmRelationshipsService, VmRelationshipsRepository],
  exports: [VmRelationshipsService, VmRelationshipsRepository],
})
export class VmRelationshipsModule {}
