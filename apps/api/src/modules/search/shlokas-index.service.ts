import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliService, errMessage } from './meili.service';

export const SHLOKAS_INDEX = 'shlokas';

export type ShlokaIndexDoc = {
  id: string;
  devanagariText: string;
  transliteration: string;
  meaningEn: string;
  meaningMr: string;
  looseTags: string[];
};

// Owns the Meilisearch `shlokas` index. Best-effort sync (failures logged, never
// thrown); search returns [] when Meili is disabled/unreachable. Independent of the
// users + blogs indices. Admin shloka CRUD (Item 30) calls upsert/remove.
@Injectable()
export class ShlokasIndexService implements OnModuleInit {
  private readonly logger = new Logger('ShlokasIndexService');

  constructor(private readonly meili: MeiliService) {}

  async onModuleInit(): Promise<void> {
    if (!this.meili.enabled) return;
    await this.meili.ensureIndex(SHLOKAS_INDEX);
    const index = this.meili.index(SHLOKAS_INDEX);
    if (!index) return;
    try {
      await index.updateSettings({
        searchableAttributes: [
          'devanagariText',
          'transliteration',
          'meaningEn',
          'meaningMr',
          'looseTags',
        ],
      });
    } catch (error) {
      this.logger.warn({ msg: 'shlokas index settings failed', error: errMessage(error) });
    }
  }

  async upsert(doc: ShlokaIndexDoc): Promise<void> {
    const index = this.meili.index(SHLOKAS_INDEX);
    if (!index) return;
    try {
      await index.addDocuments([doc]);
    } catch (error) {
      this.logger.warn({
        msg: 'shlokas index upsert failed',
        id: doc.id,
        error: errMessage(error),
      });
    }
  }

  async remove(id: string): Promise<void> {
    const index = this.meili.index(SHLOKAS_INDEX);
    if (!index) return;
    try {
      await index.deleteDocument(id);
    } catch (error) {
      this.logger.warn({ msg: 'shlokas index remove failed', id, error: errMessage(error) });
    }
  }

  async search(query: string, limit = 30): Promise<string[]> {
    const index = this.meili.index(SHLOKAS_INDEX);
    if (!index) return [];
    try {
      const res = await index.search<ShlokaIndexDoc>(query, { limit });
      return res.hits.map((h) => h.id);
    } catch (error) {
      this.logger.warn({ msg: 'shlokas search failed', error: errMessage(error) });
      return [];
    }
  }
}
