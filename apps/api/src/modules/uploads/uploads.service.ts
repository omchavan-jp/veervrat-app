import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
  Logger,
} from '@nestjs/common';
import { UploadsRepository } from './uploads.repository';
import type { SessionUser } from '../auth/types/auth.types';

interface UploadRequest {
  fileBuffer: string; // base64
  filename: string;
  mimeType: string;
  roomId?: string;
}

@Injectable()
export class UploadsService {
  private logger = new Logger('UploadsService');
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly MAX_SIZE_MB = 10;

  constructor(private uploadsRepository: UploadsRepository) {}

  async uploadChatImage(
    request: UploadRequest,
    user: SessionUser,
  ): Promise<{ url: string }> {
    if (!this.ALLOWED_TYPES.includes(request.mimeType)) {
      throw new BadRequestException('File type not supported');
    }

    const bufferSize = Buffer.byteLength(request.fileBuffer, 'base64');
    const sizeMB = bufferSize / (1024 * 1024);
    if (sizeMB > this.MAX_SIZE_MB) {
      throw new PayloadTooLargeException(
        `File exceeds ${this.MAX_SIZE_MB}MB limit`,
      );
    }

    const key = `${Date.now()}-${request.filename}`;
    const minioUrl = `${process.env.MINIO_PUBLIC_URL}/chat/${key}`;

    try {
      // TODO: Implement S3 client upload when @aws-sdk/client-s3 is available
      // For now, just record the metadata and return the URL
      this.logger.debug(`Would upload to MinIO: ${minioUrl}`);

      await this.uploadsRepository.createUploadRecord(
        user.id,
        minioUrl,
        request.filename,
        request.roomId,
      );

      return { url: minioUrl };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
}
