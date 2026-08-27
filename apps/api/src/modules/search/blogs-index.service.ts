import { Injectable } from '@nestjs/common';
import { SearchUnavailableException } from './search-unavailable.exception';

export const BLOGS_INDEX = 'blogs';

export type BlogIndexDoc = {
  id: string;
  title: string;
  bodyText: string;
};

// Blog full-text search is not yet migrated to Postgres. The previous Meilisearch
// backend was never provisioned, so search silently returned empty results — which
// looked like missing content rather than a broken feature. This version throws a
// typed exception so callers can render "search unavailable" instead of "no results".
//
// Index maintenance (upsert/remove) remains a no-op: there is nothing to sync until
// the Postgres migration lands (#194 item 2).
@Injectable()
export class BlogsIndexService {

  async upsert(_doc: BlogIndexDoc): Promise<void> {
    // No-op until blog search migrates to Postgres (#194 item 2).
  }

  async remove(_id: string): Promise<void> {
    // No-op.
  }

  async search(_query: string, _limit = 20): Promise<string[]> {
    throw new SearchUnavailableException('blogs');
  }
}
