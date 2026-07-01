import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { TestsService } from './tests.service';
import type { SessionUser } from '../auth/types/auth.types';
import {
  TestAlreadySubmittedException,
  TestNotSubmittedException,
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';

const WEAKNESS_ID = 'wid-1';
const USER_ID = 'uid-1';
const OTHER_USER_ID = 'uid-2';
const TEST_ID = 'tid-1';

function makeUser(id: string, roles: Role[] = [Role.VRATARTHI]): SessionUser {
  return {
    id,
    email: `${id}@x.com`,
    displayName: id,
    username: id,
    roles,
    language: 'EN',
    gender: null,
    dob: null,
    avatarUrl: null,
    emailVerifiedAt: new Date(),
    accountSetupCompletedAt: new Date(),
    onboardingCompletedAt: new Date(),
  };
}

const OWNER = makeUser(USER_ID);
const OTHER_USER = makeUser(OTHER_USER_ID);
const VM_USER = makeUser('vm-1', [Role.VRATMITRA]);

const DRAFT_TEST = { id: TEST_ID, weaknessId: WEAKNESS_ID, isDraft: true };
const SUBMITTED_TEST = {
  id: TEST_ID,
  userId: USER_ID,
  weaknessId: WEAKNESS_ID,
  isDraft: false,
  submittedAt: new Date(),
  answers: [],
};
const OWNED_DRAFT = {
  id: TEST_ID,
  userId: USER_ID,
  weaknessId: WEAKNESS_ID,
  isDraft: true,
  submittedAt: null,
  answers: [],
};

const SENTENCE = (id: string, score: number | null) => ({
  sentenceId: id,
  textEn: `Sentence ${id}`,
  textMr: null,
  score,
  subvirtueId: 'sv-1',
  subvirtueNameEn: 'Subvirtue',
  subvirtueNameMr: null,
  virtueId: 'v-1',
  virtueNameEn: 'Virtue',
  virtueNameMr: null,
});

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findDraftByUserAndWeakness: vi.fn().mockResolvedValue(null),
    countSentencesForWeakness: vi.fn().mockResolvedValue(10),
    createDraft: vi.fn().mockResolvedValue(DRAFT_TEST),
    findById: vi.fn().mockResolvedValue(OWNED_DRAFT),
    countAnswers: vi.fn().mockResolvedValue(3),
    upsertAnswers: vi.fn().mockResolvedValue(undefined),
    markSubmitted: vi.fn().mockResolvedValue({
      id: TEST_ID,
      weaknessId: WEAKNESS_ID,
      isDraft: false,
      submittedAt: new Date(),
    }),
    findReportData: vi.fn().mockResolvedValue({
      id: TEST_ID,
      userId: USER_ID,
      weaknessId: WEAKNESS_ID,
      weaknessNameEn: 'Test Weakness',
      weaknessNameMr: null,
      isDraft: false,
      submittedAt: new Date(),
      sentences: [SENTENCE('s1', 1), SENTENCE('s2', 2), SENTENCE('s3', 3), SENTENCE('s4', null)],
    }),
    ...overrides,
  };
}

function makeVmRepo(overrides: Record<string, unknown> = {}) {
  return {
    getVratarthiVmContext: vi.fn().mockResolvedValue({
      globalVmRelationship: null,
      vmAssignments: [],
    }),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo>, vmRepo = makeVmRepo()) {
  const service = Object.create(TestsService.prototype) as TestsService;
  (service as unknown as Record<string, unknown>)['testsRepository'] = repo;
  (service as unknown as Record<string, unknown>)['vmRelationshipsRepository'] = vmRepo;
  return service;
}

// ─── createOrResumeDraft ─────────────────────────────────────────────────────

describe('TestsService — createOrResumeDraft', () => {
  it('creates new draft when none exists', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    const result = await service.createOrResumeDraft(USER_ID, WEAKNESS_ID);
    expect(repo.createDraft).toHaveBeenCalledWith(USER_ID, WEAKNESS_ID);
    expect(result.existed).toBe(false);
    expect(result.isDraft).toBe(true);
    expect(result.answeredCount).toBe(0);
  });

  it('returns existing draft with existed=true', async () => {
    const repo = makeRepo({ findDraftByUserAndWeakness: vi.fn().mockResolvedValue(DRAFT_TEST) });
    const service = makeService(repo);
    const result = await service.createOrResumeDraft(USER_ID, WEAKNESS_ID);
    expect(repo.createDraft).not.toHaveBeenCalled();
    expect(result.existed).toBe(true);
    expect(result.id).toBe(TEST_ID);
  });
});

// ─── saveAnswers ──────────────────────────────────────────────────────────────

describe('TestsService — saveAnswers', () => {
  it('POSITIVE: upserts answers for draft test', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    const answers = [{ sentenceId: 's1', score: 2 }];
    const result = await service.saveAnswers(USER_ID, TEST_ID, answers);
    expect(repo.upsertAnswers).toHaveBeenCalledWith(TEST_ID, answers);
    expect(result.answeredCount).toBe(3);
  });

  it('NEGATIVE: throws AccessDeniedException for wrong owner', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    await expect(service.saveAnswers(OTHER_USER_ID, TEST_ID, [])).rejects.toThrow(
      AccessDeniedException,
    );
  });

  it('NEGATIVE: throws TestAlreadySubmittedException for submitted test', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(SUBMITTED_TEST) });
    const service = makeService(repo);
    await expect(service.saveAnswers(USER_ID, TEST_ID, [])).rejects.toThrow(
      TestAlreadySubmittedException,
    );
  });

  it('NEGATIVE: throws EntityNotFoundException for unknown test', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = makeService(repo);
    await expect(service.saveAnswers(USER_ID, TEST_ID, [])).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});

// ─── submitTest ───────────────────────────────────────────────────────────────

describe('TestsService — submitTest', () => {
  it('POSITIVE: marks draft as submitted', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    const result = await service.submitTest(USER_ID, TEST_ID);
    expect(repo.markSubmitted).toHaveBeenCalledWith(TEST_ID);
    expect(result.isDraft).toBe(false);
  });

  it('NEGATIVE: throws TestAlreadySubmittedException for already-submitted test', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(SUBMITTED_TEST) });
    const service = makeService(repo);
    await expect(service.submitTest(USER_ID, TEST_ID)).rejects.toThrow(
      TestAlreadySubmittedException,
    );
  });

  it('NEGATIVE: throws AccessDeniedException for wrong owner', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    await expect(service.submitTest(OTHER_USER_ID, TEST_ID)).rejects.toThrow(AccessDeniedException);
  });
});

// ─── getReport ────────────────────────────────────────────────────────────────

describe('TestsService — getReport', () => {
  it('POSITIVE: returns flagged sentences sorted Never before Sometimes', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    const report = await service.getReport(OWNER, TEST_ID);
    expect(report.flaggedSentences).toHaveLength(2);
    expect(report.flaggedSentences[0].score).toBe(1); // Never first
    expect(report.flaggedSentences[1].score).toBe(2); // Sometimes second
    expect(report.otherSentences).toHaveLength(2); // score 3 + null
  });

  it('deduplicates virtues from flagged sentences', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    const report = await service.getReport(OWNER, TEST_ID);
    // Both flagged sentences share the same virtueId='v-1'
    expect(report.virtuesToExplore).toHaveLength(1);
    expect(report.virtuesToExplore[0].virtueId).toBe('v-1');
  });

  it('NEGATIVE: throws TestNotSubmittedException for draft test', async () => {
    const draftData = {
      id: TEST_ID,
      userId: USER_ID,
      weaknessId: WEAKNESS_ID,
      weaknessNameEn: 'W',
      weaknessNameMr: null,
      isDraft: true,
      submittedAt: null,
      sentences: [],
    };
    const repo = makeRepo({ findReportData: vi.fn().mockResolvedValue(draftData) });
    const service = makeService(repo);
    await expect(service.getReport(OWNER, TEST_ID)).rejects.toThrow(TestNotSubmittedException);
  });

  it('AUTH MATRIX POSITIVE: active global VM of the owner can view results', async () => {
    const repo = makeRepo();
    const vmRepo = makeVmRepo({
      getVratarthiVmContext: vi.fn().mockResolvedValue({
        globalVmRelationship: { vmId: VM_USER.id, vratarthiId: USER_ID, state: 'ACTIVE' },
        vmAssignments: [],
      }),
    });
    const service = makeService(repo, vmRepo);
    const report = await service.getReport(VM_USER, TEST_ID);
    expect(report.id).toBe(TEST_ID);
  });

  it('AUTH MATRIX NEGATIVE: unrelated user (no relationship) is denied', async () => {
    const repo = makeRepo();
    const service = makeService(repo); // default vmRepo → no relationships
    await expect(service.getReport(OTHER_USER, TEST_ID)).rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: throws EntityNotFoundException for unknown test', async () => {
    const repo = makeRepo({ findReportData: vi.fn().mockResolvedValue(null) });
    const service = makeService(repo);
    await expect(service.getReport(OWNER, TEST_ID)).rejects.toThrow(EntityNotFoundException);
  });
});
