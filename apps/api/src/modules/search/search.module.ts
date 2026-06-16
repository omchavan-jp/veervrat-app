import { Global, Module } from '@nestjs/common';
import { MeiliService } from './meili.service';
import { UsersIndexService } from './users-index.service';

// Global so any module can inject the index services without re-importing. Keep this
// module dependency-free (only config) to avoid cycles — index *seeding* from the DB
// happens in the owning domain module (e.g. users), which already depends on search.
@Global()
@Module({
  providers: [MeiliService, UsersIndexService],
  exports: [MeiliService, UsersIndexService],
})
export class SearchModule {}
