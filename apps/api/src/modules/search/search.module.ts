import { Global, Module } from '@nestjs/common';
import { MeiliService } from './meili.service';
import { UsersIndexService } from './users-index.service';
import { BlogsIndexService } from './blogs-index.service';
import { ShlokasIndexService } from './shlokas-index.service';

// Global so any module can inject the index services without re-importing. Keep this
// module dependency-free (only config) to avoid cycles — index *seeding* from the DB
// happens in the owning domain module (e.g. users, blogs), which already depends on search.
@Global()
@Module({
  providers: [MeiliService, UsersIndexService, BlogsIndexService, ShlokasIndexService],
  exports: [MeiliService, UsersIndexService, BlogsIndexService, ShlokasIndexService],
})
export class SearchModule {}
