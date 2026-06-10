import { Injectable } from '@nestjs/common';
import { TestsRepository } from './tests.repository';
import { VmRelationshipsRepository } from '../vm-relationships/vm-relationships.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';
import type { JourneySlim } from '../../common/permissions/types';
import {
  EntityNotFoundException,
  AccessDeniedException,
  TestAlreadySubmittedException,
  TestNotSubmittedException,
} from '../../common/exceptions/app.exceptions';

@Injectable()
export class TestsService {
  constructor(
    private readonly testsRepository: TestsRepository,
    private readonly vmRelationshipsRepository: VmRelationshipsRepository,
  ) {}

  // Builds the VM-context "journey" slim used by test.view_results: the test owner's
  // active global VM + journey VM assignments, collapsed onto one synthetic JourneySlim
  // so hasPermission can authorize the owner and their VMs uniformly.
  private async buildOwnerVmContext(ownerId: string): Promise<JourneySlim> {
    const ctx = await this.vmRelationshipsRepository.getVratarthiVmContext(ownerId);
    return {
      id: `test-owner:${ownerId}`,
      vratarthiId: ownerId,
      vmAssignments: ctx.vmAssignments,
      globalVmRelationship: ctx.globalVmRelationship,
    };
  }

  private async assertCanViewResults(
    user: SessionUser,
    attempt: { userId: string; weaknessId: string },
  ): Promise<void> {
    // Fast path: owner — no need to load VM context.
    if (attempt.userId === user.id) return;
    const journey = await this.buildOwnerVmContext(attempt.userId);
    const allowed = hasPermission(
      user,
      { type: 'test_attempt', attempt, journey },
      'test.view_results',
    );
    if (!allowed) throw new AccessDeniedException();
  }

  // Draft-editor data (answers for taking/resuming) — owner-only. VMs view finished
  // results via getReport, never the draft editor.
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

  async getReport(user: SessionUser, testId: string) {
    const data = await this.testsRepository.findReportData(testId);
    if (!data) throw new EntityNotFoundException('TestAttempt', testId);
    await this.assertCanViewResults(user, { userId: data.userId, weaknessId: data.weaknessId });
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
