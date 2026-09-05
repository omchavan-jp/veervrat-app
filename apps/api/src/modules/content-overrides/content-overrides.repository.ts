import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { STORAGE_PROVIDER, type StorageProvider } from '../uploads/storage/storage-provider';
import { OVERRIDE_LOCALES, type OverrideLocale } from './dto/upsert-override.dto';

// A staged override entry: the edited value plus who staged it and when.
export type OverrideEntry = {
  value: string;
  editedById: string;
  editedByName: string;
  editedAt: string; // ISO timestamp
};
// dotted message key → staged entry
export type OverrideMap = Record<string, OverrideEntry>;
export type OverridesByLocale = Record<OverrideLocale, OverrideMap>;

const KEY_PREFIX = 'content-overrides';

/**
 * Persistence boundary for staged content overrides. They live as per-locale JSON blobs under a
 * prefix in the application's object store — deliberately NOT a Prisma table, so the feature
 * adds no schema and is removable by deleting the prefix.
 *
 * ## Why this goes through StorageProvider
 *
 * It used to construct its own `S3Client` from `S3_ENDPOINT` and friends. That was the only
 * remaining direct S3 consumer after the uploads path moved behind `StorageProvider` (#139), and
 * it meant this module was unreachable on any environment that is not S3-shaped: deployed
 * environments set the Azure variables and deliberately set no S3 ones, because the storage
 * factory refuses to start when both are present. So the client was always null there and every
 * call answered 503 "Content storage is not configured" — on an environment where storage was in
 * fact working perfectly for uploads.
 *
 * ## Why `getOrNull` rather than catching a not-found here
 *
 * There is no database row recording whether a locale has ever been edited, so the blob's
 * absence IS the "nothing staged yet" signal, and reading it must not be an error. Recognising
 * that condition means recognising the SDK's not-found error — and the two SDKs disagree on
 * every field such a check could test. Doing it here would reintroduce exactly the backend
 * coupling this change removes, so each provider translates its own SDK and this file asks a
 * question neither backend's vocabulary appears in.
 */
@Injectable()
export class ContentOverridesRepository {
  private readonly logger = new Logger('ContentOverridesRepository');

  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  private objectKey(locale: OverrideLocale): string {
    return `${KEY_PREFIX}/${locale}.json`;
  }

  async readLocale(locale: OverrideLocale): Promise<OverrideMap> {
    try {
      // Private: staged edits are unpublished drafts and must not be anonymously readable.
      const buf = await this.storage.getOrNull(this.objectKey(locale), 'private');
      // Nothing staged for this locale yet — the ordinary state before anyone has edited.
      if (!buf || buf.length === 0) return {};

      const parsed = JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
      // Normalize on read so the pre-attribution format (plain string values) still works.
      const map: OverrideMap = {};
      for (const [key, value] of Object.entries(parsed)) map[key] = normalizeEntry(value);
      return map;
    } catch (err) {
      this.logger.error({ msg: 'read overrides failed', locale, error: errMessage(err) });
      throw new ServiceUnavailableException('Failed to read content overrides');
    }
  }

  async readAll(): Promise<OverridesByLocale> {
    const entries = await Promise.all(
      OVERRIDE_LOCALES.map(async (locale) => [locale, await this.readLocale(locale)] as const),
    );
    return Object.fromEntries(entries) as OverridesByLocale;
  }

  async writeLocale(locale: OverrideLocale, map: OverrideMap): Promise<void> {
    // Sorted keys keep the staging blob's diffs stable (internal artifact — the published
    // message files preserve their original key order instead).
    const sorted = Object.fromEntries(
      Object.keys(map)
        .sort()
        .map((k) => [k, map[k]]),
    );
    try {
      await this.storage.put(
        this.objectKey(locale),
        Buffer.from(JSON.stringify(sorted, null, 2), 'utf8'),
        'application/json',
        'private',
      );
    } catch (err) {
      this.logger.error({ msg: 'write overrides failed', locale, error: errMessage(err) });
      throw new ServiceUnavailableException('Failed to store content override');
    }
  }
}

function normalizeEntry(value: unknown): OverrideEntry {
  if (typeof value === 'string') {
    return { value, editedById: '', editedByName: 'unknown', editedAt: '' };
  }
  const e = (value ?? {}) as Partial<OverrideEntry>;
  return {
    value: typeof e.value === 'string' ? e.value : '',
    editedById: e.editedById ?? '',
    editedByName: e.editedByName ?? 'unknown',
    editedAt: e.editedAt ?? '',
  };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
