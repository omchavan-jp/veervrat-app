import { Global, Module } from '@nestjs/common';
import { MeiliService } from './meili.service';
import { UsersIndexService } from './users-index.service';
import { BlogsIndexService } from './blogs-index.service';
import { ShlokasIndexService } from './shlokas-index.service';

// Global so any module can inject the index services without re-importing.
//
// UsersIndexService now queries Postgres directly (pg_trgm) — it injects
// PrismaService, which is also @Global() via PrismaModule (no explicit
// dependency needed here). BlogsIndexService and ShlokasIndexService are
// stubs that throw SearchUnavailableException until their Postgres migration
// lands (#194 items 2–3).
//
// MeiliService is kept exported for now — removing it is #194 item 4 (after
// all three entity types are migrated and the meilisearch dependency is
// dropped).
@Global()
@Module({
  providers: [MeiliService, UsersIndexService, BlogsIndexService, ShlokasIndexService],
  exports: [MeiliService, UsersIndexService, BlogsIndexService, ShlokasIndexService],
})
export class SearchModule {}
