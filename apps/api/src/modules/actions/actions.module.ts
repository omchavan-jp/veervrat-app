import { Module } from '@nestjs/common';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';
import { ActionsRepository } from './actions.repository';
import { AuthModule } from '../auth/auth.module';
import { VmRelationshipsModule } from '../vm-relationships/vm-relationships.module';

@Module({
  imports: [AuthModule, VmRelationshipsModule],
  controllers: [ActionsController],
  providers: [ActionsService, ActionsRepository],
})
export class ActionsModule {}
