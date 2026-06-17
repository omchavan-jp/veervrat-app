import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { ContentRepository } from './content.repository';
import { ShlokasIndexService } from '../search/shlokas-index.service';
import { EntityNotFoundException } from '../../common/exceptions/app.exceptions';

@Injectable()
export class ContentService implements OnModuleInit {
  private readonly logger = new Logger('ContentService');

  constructor(
    private readonly repository: ContentRepository,
    private readonly shlokasIndex: ShlokasIndexService,
  ) {}

  // Seed the shlokas index so search works without a manual reindex.
  async onModuleInit(): Promise<void> {
    try {
      const shlokas = await this.repository.allShlokasForIndex();
      await Promise.all(shlokas.map((s) => this.shlokasIndex.upsert(this.toIndexDoc(s))));
    } catch (error) {
      this.logger.warn({ msg: 'shloka index seed failed', error: error instanceof Error ? error.message : String(error) });
    }
  }

  getPothiSections() {
    return this.repository.listPothiSections();
  }

  getShlokas(source?: string, cursor?: string) {
    return this.repository.listShlokas({ source, cursor });
  }

  async searchShlokas(query: string) {
    const q = query.trim();
    if (q.length < 2) return [];
    const ids = await this.shlokasIndex.search(q);
    if (ids.length === 0) return [];
    return this.repository.findShlokasByIds(ids);
  }

  async getShloka(id: string) {
    const shloka = await this.repository.findShlokaDetail(id);
    if (!shloka) throw new EntityNotFoundException('Shloka', id);
    return shloka;
  }

  // Shloka of the day: scheduled date takes priority, else rotate the queue by day.
  async getToday() {
    const now = new Date();
    const dateOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const scheduled = await this.repository.findScheduledShloka(dateOnly);
    if (scheduled) return scheduled;
    const dayIndex = Math.floor(dateOnly.getTime() / 86_400_000);
    return this.repository.pickFromQueue(dayIndex);
  }

  getResources(type?: ResourceType, cursor?: string) {
    return this.repository.listResources({ type, cursor });
  }

  async getResource(id: string) {
    const resource = await this.repository.findResourceDetail(id);
    if (!resource) throw new EntityNotFoundException('Resource', id);
    return resource;
  }

  // Exposed so admin shloka CRUD (Item 30) can keep the index current.
  syncShlokaToIndex(shloka: { id: string; devanagariText: string; transliteration: string | null; meaningEn: string | null; meaningMr: string | null; looseTags: string[] }): void {
    void this.shlokasIndex.upsert(this.toIndexDoc(shloka));
  }

  removeShlokaFromIndex(id: string): void {
    void this.shlokasIndex.remove(id);
  }

  private toIndexDoc(s: { id: string; devanagariText: string; transliteration: string | null; meaningEn: string | null; meaningMr: string | null; looseTags: string[] }) {
    return {
      id: s.id,
      devanagariText: s.devanagariText,
      transliteration: s.transliteration ?? '',
      meaningEn: s.meaningEn ?? '',
      meaningMr: s.meaningMr ?? '',
      looseTags: s.looseTags,
    };
  }
}
