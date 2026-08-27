import { Injectable } from '@nestjs/common';
import { SearchUnavailableException } from './search-unavailable.exception';

export const SHLOKAS_INDEX = 'shlokas';

export type ShlokaIndexDoc = {
  id: string;
  devanagariText: string;
  transliteration: string;
  meaningEn: string;
  meaningMr: string;
  looseTags: string[];
};

// Shloka full-text search is not yet migrated to Postgres. Same posture as
// BlogsIndexService — throws SearchUnavailableException so callers can distinguish
// "not available" from "no results". Index maintenance is a no-op.
@Injectable()
export class ShlokasIndexService {
  async upsert(_doc: ShlokaIndexDoc): Promise<void> {
    // No-op until shloka search migrates to Postgres (#194 item 2).
  }

  async remove(_id: string): Promise<void> {
    // No-op.
  }

  search(_query: string, _limit = 30): Promise<string[]> {
    return Promise.reject(new SearchUnavailableException('shlokas'));
  }
}
