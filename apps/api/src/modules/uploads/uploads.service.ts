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
    _purpose: UploadPurpose,
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

    // Randomized path — never the original filename (PES §uploads).
    const ext = EXT_BY_TYPE[contentType];
    const key = `uploads/${randomUUID()}.${ext}`;

    let url: string;
    try {
      ({ url } = await this.storage.put(key, body, contentType));
    } catch (error) {
      this.logger.error({
        msg: 'Object storage upload failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ServiceUnavailableException('Failed to store the file');
    }

    await this.uploadsRepository.createUploadRecord(user.id, url, request.filename, request.roomId);
    return { url };
  }
}
