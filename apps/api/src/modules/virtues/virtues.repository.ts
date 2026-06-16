import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VirtuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listVirtues() {
    const virtues = await this.prisma.virtue.findMany({
      select: {
        id: true,
        nameEn: true,
        nameMr: true,
        description: true,
        _count: { select: { subvirtues: true } },
      },
      orderBy: { nameEn: 'asc' },
    });
    return virtues.map((v) => ({
      id: v.id,
      nameEn: v.nameEn,
      nameMr: v.nameMr,
      description: v.description,
      subvirtueCount: v._count.subvirtues,
    }));
  }

  async findVirtueById(id: string) {
    const virtue = await this.prisma.virtue.findUnique({
      where: { id },
      select: {
        id: true,
        nameEn: true,
        nameMr: true,
        description: true,
        subvirtues: {
          select: { id: true, nameEn: true, nameMr: true, description: true },
          orderBy: { nameEn: 'asc' },
        },
      },
    });
    return virtue;
  }

  async findSubvirtueById(id: string) {
    const subvirtue = await this.prisma.subvirtue.findUnique({
      where: { id },
      select: {
        id: true,
        nameEn: true,
        nameMr: true,
        description: true,
        virtue: { select: { id: true, nameEn: true, nameMr: true } },
        weaknesses: {
          select: {
            priority: true,
            weakness: { select: { id: true, nameEn: true, nameMr: true } },
          },
          orderBy: { priority: 'asc' },
        },
        sentences: {
          select: { id: true, textEn: true, textMr: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!subvirtue) return null;
    return {
      id: subvirtue.id,
      nameEn: subvirtue.nameEn,
      nameMr: subvirtue.nameMr,
      description: subvirtue.description,
      virtue: subvirtue.virtue,
      weaknesses: subvirtue.weaknesses.map((w) => w.weakness),
      sentences: subvirtue.sentences,
    };
  }

  async findSentenceById(id: string) {
    return this.prisma.sentence.findUnique({
      where: { id },
      select: {
        id: true,
        textEn: true,
        textMr: true,
        subvirtue: {
          select: {
            id: true,
            nameEn: true,
            nameMr: true,
            virtue: { select: { id: true, nameEn: true, nameMr: true } },
          },
        },
      },
    });
  }
}
