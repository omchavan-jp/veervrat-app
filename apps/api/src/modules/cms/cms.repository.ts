import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TiptapDoc } from '../../common/tiptap/sanitize';

const CMS_SELECT = {
  id: true,
  key: true,
  titleEn: true,
  titleMr: true,
  bodyEn: true,
  bodyMr: true,
  updatedAt: true,
} as const;

@Injectable()
export class CmsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByKey(key: string) {
    return this.prisma.cmsPage.findUnique({ where: { key }, select: CMS_SELECT });
  }

  list() {
    return this.prisma.cmsPage.findMany({ orderBy: { key: 'asc' }, select: CMS_SELECT });
  }

  upsert(data: {
    key: string;
    titleEn: string;
    titleMr?: string;
    bodyEn: TiptapDoc;
    bodyMr?: TiptapDoc;
    updatedById: string;
  }) {
    const bodyEn = data.bodyEn as unknown as Prisma.InputJsonValue;
    const bodyMr = data.bodyMr !== undefined ? (data.bodyMr as unknown as Prisma.InputJsonValue) : undefined;
    return this.prisma.cmsPage.upsert({
      where: { key: data.key },
      create: {
        key: data.key,
        titleEn: data.titleEn,
        titleMr: data.titleMr,
        bodyEn,
        ...(bodyMr !== undefined ? { bodyMr } : {}),
        updatedById: data.updatedById,
      },
      update: {
        titleEn: data.titleEn,
        titleMr: data.titleMr,
        bodyEn,
        ...(bodyMr !== undefined ? { bodyMr } : {}),
        updatedById: data.updatedById,
      },
      select: CMS_SELECT,
    });
  }

  update(
    key: string,
    data: { titleEn?: string; titleMr?: string; bodyEn?: TiptapDoc; bodyMr?: TiptapDoc; updatedById: string },
  ) {
    return this.prisma.cmsPage.update({
      where: { key },
      data: {
        ...(data.titleEn !== undefined ? { titleEn: data.titleEn } : {}),
        ...(data.titleMr !== undefined ? { titleMr: data.titleMr } : {}),
        ...(data.bodyEn !== undefined ? { bodyEn: data.bodyEn as unknown as Prisma.InputJsonValue } : {}),
        ...(data.bodyMr !== undefined ? { bodyMr: data.bodyMr as unknown as Prisma.InputJsonValue } : {}),
        updatedById: data.updatedById,
      },
      select: CMS_SELECT,
    });
  }

  delete(key: string) {
    return this.prisma.cmsPage.delete({ where: { key }, select: { id: true } });
  }
}
