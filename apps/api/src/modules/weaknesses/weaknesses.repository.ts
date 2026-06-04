import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WeaknessesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId?: string) {
    // Single query: include both journey and test attempt counts when userId present
    const weaknesses = await this.prisma.weakness.findMany({
      select: {
        id: true,
        nameEn: true,
        nameMr: true,
        category: true,
        description: true,
        ...(userId
          ? {
              _count: {
                select: {
                  journeyWeaknesses: {
                    where: {
                      journey: {
                        vratarthiId: userId,
                        state: { in: ['ACTIVE', 'PAUSED'] },
                      },
                    },
                  },
                  testAttempts: {
                    where: { userId, isDraft: false },
                  },
                },
              },
            }
          : {}),
      },
      orderBy: [{ category: 'asc' }, { nameEn: 'asc' }],
    });

    return weaknesses.map((w) => {
      const counts = (w as { _count?: { journeyWeaknesses: number; testAttempts: number } })._count;
      return {
        id: w.id,
        nameEn: w.nameEn,
        nameMr: w.nameMr,
        category: w.category ?? 'other',
        description: w.description,
        stats: userId
          ? {
              testsTaken: counts?.testAttempts ?? 0,
              hasActiveJourney: (counts?.journeyWeaknesses ?? 0) > 0,
            }
          : null,
      };
    });
  }

  async findById(id: string, userId?: string) {
    const weakness = await this.prisma.weakness.findUnique({
      where: { id },
      select: {
        id: true,
        nameEn: true,
        nameMr: true,
        category: true,
        description: true,
        subvirtues: {
          select: {
            priority: true,
            subvirtue: {
              select: {
                id: true,
                nameEn: true,
                nameMr: true,
                description: true,
                virtue: { select: { id: true, nameEn: true, nameMr: true } },
                sentences: {
                  select: { id: true, textEn: true, textMr: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!weakness) return null;

    let testHistory: { id: string; submittedAt: Date; answeredCount: number }[] = [];
    let draftTestId: string | null = null;

    if (userId) {
      const tests = await this.prisma.testAttempt.findMany({
        where: { userId, weaknessId: id },
        select: {
          id: true,
          isDraft: true,
          submittedAt: true,
          _count: { select: { answers: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Count sentences for this weakness (via subvirtues)
      const totalSentences = await this.prisma.sentence.count({
        where: { subvirtue: { weaknesses: { some: { weaknessId: id } } } },
      });

      testHistory = tests
        .filter((t) => !t.isDraft)
        .map((t) => ({
          id: t.id,
          submittedAt: t.submittedAt!,
          answeredCount: t._count.answers,
          totalSentences,
        }));

      const draft = tests.find((t) => t.isDraft);
      draftTestId = draft?.id ?? null;
    }

    return {
      id: weakness.id,
      nameEn: weakness.nameEn,
      nameMr: weakness.nameMr,
      category: weakness.category ?? 'other',
      description: weakness.description,
      subvirtues: weakness.subvirtues.map((ws) => ({
        id: ws.subvirtue.id,
        nameEn: ws.subvirtue.nameEn,
        nameMr: ws.subvirtue.nameMr,
        description: ws.subvirtue.description,
        priority: ws.priority,
        virtue: ws.subvirtue.virtue,
        sentences: ws.subvirtue.sentences.map((s) => ({
          sentenceId: s.id,
          textEn: s.textEn,
          textMr: s.textMr,
        })),
      })),
      testHistory,
      draftTestId,
    };
  }
}
