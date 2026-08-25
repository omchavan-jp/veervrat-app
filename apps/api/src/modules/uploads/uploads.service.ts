import {
  Injectable,
  Inject,
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import heicConvert from 'heic-convert';
import { ConfigService } from '@nestjs/config';
import { UploadsRepository } from './uploads.repository';
import { extractUploadKeys } from './upload-references';
import { STORAGE_PROVIDER, type StorageProvider } from './storage/storage-provider';
import type { SessionUser } from '../auth/types/auth.types';

interface UploadRequest {
  fileBuffer: string; // base64
  filename: string;
  mimeType: string;
  roomId?: string;
}

/**
 * The advertised maximum upload size, in megabytes.
 *
 * Exported because the HTTP body limit MUST be derived from it (`bootstrap.ts`). They were
 * independent until 2026-08-25, and the result was that this constant said 10MB while Express's
 * default 100kb body limit rejected anything larger — before this service ever ran, so the
 * friendly PayloadTooLargeException below was unreachable and the user got a bare 500.
 *
 * Any image a person would actually upload from a phone exceeds 100kb, so image upload had never
 * worked in a deployed environment. It went unnoticed because the only file ever uploaded through
 * it was a 163-byte test PNG.
 */
export const MAX_UPLOAD_MB = 10;

export type UploadPurpose = 'chat' | 'experience' | 'blog';

// Blog posts are published content: a stable, cacheable URL is the right answer there, not a
// concession. Everything else is private (#178) — and the set is written as an allowlist so a
// purpose added later is private until somebody deliberately decides otherwise.
const PUBLIC_PURPOSES = new Set<UploadPurpose>(['blog']);

// What gets embedded in stored content. Must stay stable across TTL changes, visibility changes
// and storage providers, because it is written into Tiptap ASTs that are never rewritten.
//
// ⚠️ Absolute, not relative, and that is a deliberate trade rather than an oversight. The web
// tier is on a different hostname from the api (the Next.js rewrite proxy was removed because it
// does not forward WebSocket upgrades), so a relative `/api/v1/uploads/...` in an <img src>
// would resolve against the WEB origin and 404. The alternative — storing something host-free
// and resolving it as each view renders — was rejected because stored content is rendered in
// several places, and any one missed serves a broken image only after a TTL elapses.
//
// This does put a hostname back into stored content. The difference from what #178 fixed is
// what KIND of hostname: this one is ours, stable, and carries no signature and no visibility
// policy. A storage hostname changes when the provider does, and a signed URL expires; the api's
// public origin changes roughly never, and if it ever did, that is a known one-time rewrite
// rather than a policy decision silently baked into every row.
const UPLOADS_PATH = '/api/v1/uploads';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

// HEIC/HEIF (the iPhone default) is accepted on upload but converted to JPEG so it
// renders in every browser — Chrome and Firefox cannot display HEIC in <img>.
const HEIC_TYPES = new Set(['image/heic', 'image/heif']);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger('UploadsService');
  private readonly ALLOWED_TYPES = [...Object.keys(EXT_BY_TYPE), ...HEIC_TYPES];
  private readonly MAX_SIZE_MB = MAX_UPLOAD_MB;

  constructor(
    private readonly uploadsRepository: UploadsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly config: ConfigService,
  ) {}

  async uploadChatImage(request: UploadRequest, user: SessionUser): Promise<{ url: string }> {
    return this.uploadImage(request, user, 'chat');
  }

  async uploadImage(
    request: UploadRequest,
    user: SessionUser,
    purpose: UploadPurpose,
  ): Promise<{ url: string }> {
    if (!this.ALLOWED_TYPES.includes(request.mimeType)) {
      throw new BadRequestException('File type not supported');
    }

    const buffer = Buffer.from(request.fileBuffer, 'base64');
    const sizeMB = buffer.byteLength / (1024 * 1024);
    if (sizeMB > this.MAX_SIZE_MB) {
      throw new PayloadTooLargeException(`File exceeds ${this.MAX_SIZE_MB}MB limit`);
    }

    // HEIC/HEIF → JPEG so the stored image renders in every browser.
    let body = buffer;
    let contentType = request.mimeType;
    if (HEIC_TYPES.has(request.mimeType)) {
      try {
        const jpeg = await heicConvert({ buffer, format: 'JPEG', quality: 0.9 });
        body = Buffer.from(jpeg);
        contentType = 'image/jpeg';
      } catch (error) {
        this.logger.warn({
          msg: 'HEIC conversion failed',
          error: error instanceof Error ? error.message : String(error),
        });
        throw new BadRequestException('Could not process this HEIC image');
      }
    }

    // Randomized name — never the original filename (PES §uploads). No `uploads/` prefix: the
    // container is already called that, and carrying both produced /uploads/uploads/<uuid>.ext.
    const ext = EXT_BY_TYPE[contentType];
    const key = `${randomUUID()}.${ext}`;

    try {
      await this.storage.put(
        key,
        body,
        contentType,
        PUBLIC_PURPOSES.has(purpose) ? 'public' : 'private',
      );
    } catch (error) {
      this.logger.error({
        msg: 'Object storage upload failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ServiceUnavailableException('Failed to store the file');
    }

    await this.uploadsRepository.createUploadRecord(
      user.id,
      key,
      request.filename,
      purpose,
      request.roomId,
    );

    // A stable application URL, never the blob's own address. Stored content (a Tiptap AST in a
    // chat message or experience log) embeds whatever is returned here, so it must not carry a
    // signature that expires or a hostname that changes with the storage provider. Resolution —
    // authorise, then redirect to a signed or public URL — happens per request, in the resolver.
    // Empty origin falls back to a relative URL, which is correct for local development where
    // web and api share `localhost` — and wrong in a deployed environment, which is exactly why
    // Terraform sets PUBLIC_API_ORIGIN there.
    const origin = this.config.get<string>('PUBLIC_API_ORIGIN', '');
    return { url: `${origin}${UPLOADS_PATH}/${key}` };
  }

  /**
   * Called when an experience log is saved, with the body that was actually stored.
   *
   * Binding at save rather than at upload is what makes an image's visibility derive from the
   * document containing it, instead of being a second, parallel rule that has to be kept in
   * agreement with the log's own. Passing the *saved* body matters: an image inserted and then
   * removed before saving is never bound, and one removed in a later edit is unbound again.
   */
  async bindToExperienceLog(experienceLogId: string, uploaderId: string, body: unknown) {
    await this.uploadsRepository.bindToExperienceLog(
      experienceLogId,
      uploaderId,
      extractUploadKeys(body),
    );
  }
}
