import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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

// Persistence boundary for staged content overrides. They live as per-locale JSON blobs in
// the existing R2/S3 bucket (new prefix) — deliberately NOT a Prisma table, so the feature
// adds no schema and is removable by deleting the prefix.
@Injectable()
export class ContentOverridesRepository {
  private readonly logger = new Logger('ContentOverridesRepository');
  private readonly s3: S3Client | null;
  private readonly bucket?: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.config.get<string>('S3_SECRET_KEY');
    this.bucket = this.config.get<string>('S3_BUCKET');

    if (endpoint && accessKeyId && secretAccessKey && this.bucket) {
      this.s3 = new S3Client({
        endpoint,
        region: this.config.get<string>('S3_REGION', 'us-east-1'),
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
    } else {
      this.s3 = null;
    }
  }

  private objectKey(locale: OverrideLocale): string {
    return `${KEY_PREFIX}/${locale}.json`;
  }

  async readLocale(locale: OverrideLocale): Promise<OverrideMap> {
    if (!this.s3 || !this.bucket) {
      throw new ServiceUnavailableException('Content storage is not configured');
    }
    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(locale) }),
      );
      const body = await res.Body?.transformToString();
      if (!body) return {};
      const parsed = JSON.parse(body) as Record<string, unknown>;
      // Normalize on read so the pre-attribution format (plain string values) still works.
      const map: OverrideMap = {};
      for (const [key, value] of Object.entries(parsed)) map[key] = normalizeEntry(value);
      return map;
    } catch (err) {
      if (isNotFound(err)) return {};
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
    if (!this.s3 || !this.bucket) {
      throw new ServiceUnavailableException('Content storage is not configured');
    }
    // Sorted keys keep the staging blob's diffs stable (internal artifact — the published
    // message files preserve their original key order instead).
    const sorted = Object.fromEntries(
      Object.keys(map)
        .sort()
        .map((k) => [k, map[k]]),
    );
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.objectKey(locale),
          Body: JSON.stringify(sorted, null, 2),
          ContentType: 'application/json',
        }),
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

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
