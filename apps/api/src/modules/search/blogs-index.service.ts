import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliService, errMessage } from './meili.service';

export const BLOGS_INDEX = 'blogs';

export type BlogIndexDoc = {
  id: string;
  title: string;
  bodyText: string;
};

// Owns the Meilisearch `blogs` index: only published, non-deleted blogs (title +
// plain-text body). Best-effort sync — failures logged, never thrown. Search returns
// [] when Meili is disabled/unreachable. Independent of the users index.
@Injectable()
export class BlogsIndexService implements OnModuleInit {
  private readonly logger = new Logger('BlogsIndexService');

  constructor(private readonly meili: MeiliService) {}

  async onModuleInit(): Promise<void> {
    if (!this.meili.enabled) return;
    await this.meili.ensureIndex(BLOGS_INDEX);
    const index = this.meili.index(BLOGS_INDEX);
    if (!index) return;
    try {
      await index.updateSettings({ searchableAttributes: ['title', 'bodyText'] });
    } catch (error) {
      this.logger.warn({ msg: 'blogs index settings failed', error: errMessage(error) });
    }
  }

  async upsert(doc: BlogIndexDoc): Promise<void> {
    const index = this.meili.index(BLOGS_INDEX);
    if (!index) return;
    try {
      await index.addDocuments([doc]);
    } catch (error) {
      this.logger.warn({ msg: 'blogs index upsert failed', id: doc.id, error: errMessage(error) });
    }
  }

  async remove(id: string): Promise<void> {
    const index = this.meili.index(BLOGS_INDEX);
    if (!index) return;
    try {
      await index.deleteDocument(id);
    } catch (error) {
      this.logger.warn({ msg: 'blogs index remove failed', id, error: errMessage(error) });
    }
  }

  async search(query: string, limit = 20): Promise<string[]> {
    const index = this.meili.index(BLOGS_INDEX);
    if (!index) return [];
    try {
      const res = await index.search<BlogIndexDoc>(query, { limit });
      return res.hits.map((h) => h.id);
    } catch (error) {
      this.logger.warn({ msg: 'blogs search failed', error: errMessage(error) });
      return [];
    }
  }
}
