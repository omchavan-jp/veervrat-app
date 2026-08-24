import { Injectable } from '@nestjs/common';
import { UploadPurpose as PrismaUploadPurpose } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UploadPurpose } from './uploads.service';

// The service speaks lowercase purposes; Prisma's enum is uppercase with a lowercase database
// mapping. One place converts, rather than every call site knowing both spellings.
const TO_PRISMA: Record<UploadPurpose, PrismaUploadPurpose> = {
  chat: PrismaUploadPurpose.CHAT,
  experience: PrismaUploadPurpose.EXPERIENCE,
  blog: PrismaUploadPurpose.BLOG,
};

@Injectable()
export class UploadsRepository {
  constructor(private prisma: PrismaService) {}

  // Takes the storage KEY, never a URL. A URL bakes in whichever visibility policy was in force
  // when the row was written, which is what made #178 a data migration rather than a setting.
  async createUploadRecord(
    uploaderId: string,
    storageKey: string,
    filename: string,
    purpose: UploadPurpose,
    roomId?: string,
  ) {
    return this.prisma.upload.create({
      data: {
        uploaderId,
        storageKey,
        filename,
        purpose: TO_PRISMA[purpose],
        roomId,
      },
    });
  }

  // The resolver endpoint needs to know what a key IS before it can decide who may see it:
  // which purpose it was uploaded for, and — for chat — which room it belongs to.
  async findByStorageKey(storageKey: string) {
    return this.prisma.upload.findFirst({
      where: { storageKey },
      select: { id: true, uploaderId: true, roomId: true, storageKey: true, purpose: true },
    });
  }
}
