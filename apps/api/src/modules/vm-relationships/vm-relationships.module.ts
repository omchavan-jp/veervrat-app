import { Module } from '@nestjs/common';
import { VmRelationshipsController } from './vm-relationships.controller';
import { VmRelationshipsService } from './vm-relationships.service';
import { VmRelationshipsRepository } from './vm-relationships.repository';
import { AuthModule } from '../auth/auth.module';
import { JourneysModule } from '../journeys/journeys.module';

@Module({
  imports: [AuthModule, JourneysModule],
  controllers: [VmRelationshipsController],
  providers: [VmRelationshipsService, VmRelationshipsRepository],
  exports: [VmRelationshipsService, VmRelationshipsRepository],
})
export class VmRelationshipsModule {}
