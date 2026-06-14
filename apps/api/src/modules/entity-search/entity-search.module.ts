import { Module } from '@nestjs/common';
import { EntitySearchController } from './entity-search.controller';
import { EntitySearchService } from './entity-search.service';
import { EntitySearchRepository } from './entity-search.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EntitySearchController],
  providers: [EntitySearchService, EntitySearchRepository],
  exports: [EntitySearchService],
})
export class EntitySearchModule {}
