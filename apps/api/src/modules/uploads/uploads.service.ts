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
import { UploadsRepository } from './uploads.repository';
import { STORAGE_PROVIDER, type StorageProvider } from './storage/storage-provider';
import type { SessionUser } from '../auth/types/auth.types';

interface UploadRequest {
  fileBuffer: string; // base64
  filename: string;
  mimeType: string;
  roomId?: string;
}

export type UploadPurpose = 'chat' | 'experience' | 'blog';

// Blog posts are published content: a stable, cacheable URL is the right answer there, not a
// concession. Everything else is private (#178) — and the set is written as an allowlist so a
// purpose added later is private until somebody deliberately decides otherwise.
const PUBLIC_PURPOSES = new Set<UploadPurpose>(['blog']);

// What gets embedded in stored content. Must stay stable across TTL changes, visibility changes
// and storage providers, because it is written into Tiptap ASTs that are never rewritten.
const UPLOADS_ROUTE = '/api/v1/uploads';

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
  private readonly MAX_SIZE_MB = 10;

  constructor(
    private readonly uploadsRepository: UploadsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
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
    return { url: `${UPLOADS_ROUTE}/${key}` };
  }
}
