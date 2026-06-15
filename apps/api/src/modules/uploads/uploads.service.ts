import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import heicConvert from 'heic-convert';
import { UploadsRepository } from './uploads.repository';
import type { SessionUser } from '../auth/types/auth.types';

interface UploadRequest {
  fileBuffer: string; // base64
  filename: string;
  mimeType: string;
  roomId?: string;
}

export type UploadPurpose = 'chat' | 'experience';

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
  private readonly s3: S3Client | null;
  private readonly bucket?: string;
  private readonly publicBase?: string;

  constructor(
    private readonly uploadsRepository: UploadsRepository,
    private readonly config: ConfigService,
  ) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.config.get<string>('S3_SECRET_KEY');
    this.bucket = this.config.get<string>('S3_BUCKET');
    // Public URL base for serving; falls back to endpoint/bucket for local MinIO.
    this.publicBase =
      this.config.get<string>('S3_PUBLIC_URL') ??
      (endpoint && this.bucket ? `${endpoint}/${this.bucket}` : undefined);

    if (endpoint && accessKeyId && secretAccessKey && this.bucket) {
      this.s3 = new S3Client({
        endpoint,
        region: this.config.get<string>('S3_REGION', 'us-east-1'),
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true, // required for MinIO
      });
    } else {
      this.s3 = null;
      this.logger.warn('S3/MinIO not configured — chat image uploads are disabled');
    }
  }

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

    if (!this.s3 || !this.bucket || !this.publicBase) {
      throw new ServiceUnavailableException('File storage is not configured');
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

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (error) {
      this.logger.error({
        msg: 'S3 upload failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ServiceUnavailableException('Failed to store the file');
    }

    const url = `${this.publicBase}/${key}`;
    await this.uploadsRepository.createUploadRecord(user.id, url, request.filename, request.roomId);
    return { url };
  }
}
