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
import { UploadsRepository } from './uploads.repository';
import type { SessionUser } from '../auth/types/auth.types';

interface UploadRequest {
  fileBuffer: string; // base64
  filename: string;
  mimeType: string;
  roomId?: string;
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class UploadsService {
  private readonly logger = new Logger('UploadsService');
  private readonly ALLOWED_TYPES = Object.keys(EXT_BY_TYPE);
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

    // Randomized path — never the original filename (PES §uploads).
    const ext = EXT_BY_TYPE[request.mimeType];
    const key = `uploads/${randomUUID()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: request.mimeType,
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
