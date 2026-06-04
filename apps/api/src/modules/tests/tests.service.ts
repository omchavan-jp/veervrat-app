import { Injectable } from '@nestjs/common';
import { TestsRepository } from './tests.repository';
import {
  EntityNotFoundException,
  AccessDeniedException,
  TestAlreadySubmittedException,
  TestNotSubmittedException,
} from '../../common/exceptions/app.exceptions';

@Injectable()
export class TestsService {
  constructor(private readonly testsRepository: TestsRepository) {}

  async getTest(userId: string, testId: string) {
    const test = await this.testsRepository.findById(testId);
    if (!test) throw new EntityNotFoundException('TestAttempt', testId);
    if (test.userId !== userId) throw new AccessDeniedException();
    return test;
  }

  async createOrResumeDraft(userId: string, weaknessId: string) {
    const existing = await this.testsRepository.findDraftByUserAndWeakness(userId, weaknessId);
    if (existing) {
      const totalSentences = await this.testsRepository.countSentencesForWeakness(weaknessId);
      const answeredCount = await this.testsRepository.countAnswers(existing.id);
      return { id: existing.id, weaknessId, isDraft: true, answeredCount, totalSentences, existed: true };
    }
    const draft = await this.testsRepository.createDraft(userId, weaknessId);
    const totalSentences = await this.testsRepository.countSentencesForWeakness(weaknessId);
    return { id: draft.id, weaknessId, isDraft: true, answeredCount: 0, totalSentences, existed: false };
  }

  async saveAnswers(userId: string, testId: string, answers: { sentenceId: string; score: number }[]) {
    const test = await this.testsRepository.findById(testId);
    if (!test) throw new EntityNotFoundException('TestAttempt', testId);
    if (test.userId !== userId) throw new AccessDeniedException();
    if (!test.isDraft) throw new TestAlreadySubmittedException();

    await this.testsRepository.upsertAnswers(testId, answers);
    const answeredCount = await this.testsRepository.countAnswers(testId);
    return { id: testId, answeredCount };
  }

  async submitTest(userId: string, testId: string) {
    const test = await this.testsRepository.findById(testId);
    if (!test) throw new EntityNotFoundException('TestAttempt', testId);
    if (test.userId !== userId) throw new AccessDeniedException();
    if (!test.isDraft) throw new TestAlreadySubmittedException();

    return this.testsRepository.markSubmitted(testId);
  }

  async getReport(userId: string, testId: string) {
    const data = await this.testsRepository.findReportData(testId);
    if (!data) throw new EntityNotFoundException('TestAttempt', testId);
    if (data.userId !== userId) throw new AccessDeniedException();
    if (data.isDraft) throw new TestNotSubmittedException();

    const flaggedSentences = data.sentences
      .filter((s) => s.score !== null && s.score <= 2)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

    const otherSentences = data.sentences.filter(
      (s) => s.score === null || s.score > 2,
    );

    // Deduplicate virtues from flagged sentences
    const virtueMap = new Map<string, { virtueId: string; virtueNameEn: string; virtueNameMr: string | null }>();
    for (const s of flaggedSentences) {
      if (!virtueMap.has(s.virtueId)) {
        virtueMap.set(s.virtueId, {
          virtueId: s.virtueId,
          virtueNameEn: s.virtueNameEn,
          virtueNameMr: s.virtueNameMr,
        });
      }
    }

    return {
      id: data.id,
      weaknessId: data.weaknessId,
      weaknessNameEn: data.weaknessNameEn,
      weaknessNameMr: data.weaknessNameMr,
      submittedAt: data.submittedAt,
      totalSentences: data.sentences.length,
      answeredCount: data.sentences.filter((s) => s.score !== null).length,
      virtuesToExplore: Array.from(virtueMap.values()),
      flaggedSentences,
      otherSentences,
    };
  }
}
