import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliService, errMessage } from './meili.service';

export const USERS_INDEX = 'users';

// A document in the users search index. Deliberately NO email — emails are never
// indexed (privacy); exact-email lookup is a strongly-consistent DB query elsewhere.
export type UserIndexDoc = {
  id: string;
  username: string;
  displayName: string;
  isPublic: boolean;
};

// Owns the Meilisearch `users` index: settings, sync (upsert/remove), and search.
// All operations are best-effort — failures are logged, never thrown into the caller's
// write path (search is eventually consistent; a Meili hiccup must not fail a profile
// save). Search returns [] when Meili is disabled/unreachable.
@Injectable()
export class UsersIndexService implements OnModuleInit {
  private readonly logger = new Logger('UsersIndexService');

  constructor(private readonly meili: MeiliService) {}

  async onModuleInit(): Promise<void> {
    if (!this.meili.enabled) return;
    await this.meili.ensureIndex(USERS_INDEX);
    const index = this.meili.index(USERS_INDEX);
    if (!index) return;
    try {
      await index.updateSettings({
        searchableAttributes: ['username', 'displayName'],
        filterableAttributes: ['isPublic'],
      });
    } catch (error) {
      this.logger.warn({ msg: 'users index settings failed', error: errMessage(error) });
    }
  }

  async upsert(doc: UserIndexDoc): Promise<void> {
    const index = this.meili.index(USERS_INDEX);
    if (!index) return;
    try {
      await index.addDocuments([doc]);
    } catch (error) {
      this.logger.warn({ msg: 'users index upsert failed', id: doc.id, error: errMessage(error) });
    }
  }

  async remove(id: string): Promise<void> {
    const index = this.meili.index(USERS_INDEX);
    if (!index) return;
    try {
      await index.deleteDocument(id);
    } catch (error) {
      this.logger.warn({ msg: 'users index remove failed', id, error: errMessage(error) });
    }
  }

  // Typo-tolerant name/username search. Excludes private profiles (filter) and the
  // requester (post-filter). Returns matched ids in relevance order — the service
  // re-hydrates full user data + presence from the DB.
  async search(query: string, requesterId: string, limit = 10): Promise<string[]> {
    const index = this.meili.index(USERS_INDEX);
    if (!index) return [];
    try {
      const res = await index.search<UserIndexDoc>(query, {
        filter: 'isPublic = true',
        limit: limit + 1, // headroom to drop self without shrinking the page
      });
      return res.hits
        .map((h) => h.id)
        .filter((id) => id !== requesterId)
        .slice(0, limit);
    } catch (error) {
      this.logger.warn({ msg: 'users search failed', error: errMessage(error) });
      return [];
    }
  }
}
