import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDraftByUserAndWeakness(userId: string, weaknessId: string) {
    return this.prisma.testAttempt.findFirst({
      where: { userId, weaknessId, isDraft: true },
      select: { id: true, weaknessId: true, isDraft: true, createdAt: true },
    });
  }

  async countSentencesForWeakness(weaknessId: string): Promise<number> {
    return this.prisma.sentence.count({
      where: { subvirtue: { weaknesses: { some: { weaknessId } } } },
    });
  }

  async createDraft(userId: string, weaknessId: string) {
    return this.prisma.testAttempt.create({
      data: { userId, weaknessId, isDraft: true },
      select: { id: true, weaknessId: true, isDraft: true, createdAt: true },
    });
  }

  async findById(id: string) {
    return this.prisma.testAttempt.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        weaknessId: true,
        isDraft: true,
        submittedAt: true,
        answers: {
          select: { id: true, sentenceId: true, score: true },
        },
      },
    });
  }

  async countAnswers(testId: string): Promise<number> {
    return this.prisma.testAnswer.count({ where: { testAttemptId: testId } });
  }

  async upsertAnswers(testId: string, answers: { sentenceId: string; score: number }[]) {
    await this.prisma.$transaction(
      answers.map(({ sentenceId, score }) =>
        this.prisma.testAnswer.upsert({
          where: { testAttemptId_sentenceId: { testAttemptId: testId, sentenceId } },
          create: { testAttemptId: testId, sentenceId, score },
          update: { score },
        }),
      ),
    );
  }

  async markSubmitted(id: string) {
    return this.prisma.testAttempt.update({
      where: { id },
      data: { isDraft: false, submittedAt: new Date() },
      select: { id: true, weaknessId: true, isDraft: true, submittedAt: true },
    });
  }

  async findReportData(id: string) {
    // Single query: include sentences via weakness→subvirtues→sentences chain
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        weaknessId: true,
        isDraft: true,
        submittedAt: true,
        weakness: {
          select: {
            nameEn: true,
            nameMr: true,
            subvirtues: {
              select: {
                subvirtue: {
                  select: {
                    id: true,
                    nameEn: true,
                    nameMr: true,
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
        },
        answers: { select: { sentenceId: true, score: true } },
      },
    });

    if (!attempt) return null;

    // Flatten sentences from the weakness→subvirtue→sentences join
    const sentences = attempt.weakness.subvirtues.flatMap((ws) =>
      ws.subvirtue.sentences.map((s) => ({
        id: s.id,
        textEn: s.textEn,
        textMr: s.textMr,
        subvirtue: {
          id: ws.subvirtue.id,
          nameEn: ws.subvirtue.nameEn,
          nameMr: ws.subvirtue.nameMr,
          virtue: ws.subvirtue.virtue,
        },
      })),
    );

    const answerMap = new Map(attempt.answers.map((a) => [a.sentenceId, a.score]));

    return {
      id: attempt.id,
      userId: attempt.userId,
      weaknessId: attempt.weaknessId,
      weaknessNameEn: attempt.weakness.nameEn,
      weaknessNameMr: attempt.weakness.nameMr,
      isDraft: attempt.isDraft,
      submittedAt: attempt.submittedAt,
      sentences: sentences.map((s) => ({
        sentenceId: s.id,
        textEn: s.textEn,
        textMr: s.textMr,
        score: answerMap.get(s.id) ?? null,
        subvirtueId: s.subvirtue.id,
        subvirtueNameEn: s.subvirtue.nameEn,
        subvirtueNameMr: s.subvirtue.nameMr,
        virtueId: s.subvirtue.virtue.id,
        virtueNameEn: s.subvirtue.virtue.nameEn,
        virtueNameMr: s.subvirtue.virtue.nameMr,
      })),
    };
  }
}
