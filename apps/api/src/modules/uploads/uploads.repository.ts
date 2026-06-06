import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UploadsRepository {
  constructor(private prisma: PrismaService) {}

  async createUploadRecord(
    uploaderId: string,
    minioUrl: string,
    filename: string,
    roomId?: string,
  ) {
    return this.prisma.upload.create({
      data: {
        uploaderId,
        minioUrl,
        filename,
        roomId,
      },
    });
  }
}
