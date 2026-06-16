import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meilisearch, type Index } from 'meilisearch';

// Thin wrapper around the Meilisearch client. Other modules never touch the raw
// client — each index has its own <Entity>IndexService that uses this. When Meili is
// not configured/reachable, this degrades to a no-op (search returns empty, writes
// still succeed) — same posture as UploadsService without MinIO.
@Injectable()
export class MeiliService {
  private readonly logger = new Logger('MeiliService');
  private readonly client: Meilisearch | null;

  constructor(config: ConfigService) {
    const host = config.get<string>('MEILI_HOST');
    const apiKey = config.get<string>('MEILI_MASTER_KEY');
    if (host) {
      this.client = new Meilisearch({ host, apiKey });
    } else {
      this.client = null;
      this.logger.warn('MEILI_HOST not set — search is disabled (returns empty results)');
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  index(uid: string): Index | null {
    return this.client ? this.client.index(uid) : null;
  }

  async health(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.health();
      return true;
    } catch {
      return false;
    }
  }

  // Ensure an index exists with the given primary key. Idempotent and best-effort:
  // a failure is logged, not thrown (boot must not depend on Meili being up).
  async ensureIndex(uid: string, primaryKey = 'id'): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.createIndex(uid, { primaryKey });
    } catch (error) {
      // Already-exists is fine; log anything else.
      const code = (error as { code?: string })?.code;
      if (code !== 'index_already_exists') {
        this.logger.warn({ msg: 'ensureIndex failed', uid, error: errMessage(error) });
      }
    }
  }
}

export function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
