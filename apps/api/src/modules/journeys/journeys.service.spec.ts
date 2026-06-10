import { describe, it, expect, vi } from 'vitest';
import { JourneyState, Role, VmRelationshipState } from '@prisma/client';
import { JourneysService } from './journeys.service';
import {
  JourneyConflictException,
  InvalidStateTransitionException,
  AccessDeniedException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const VA_USER: SessionUser = {
  id: 'va-1',
  email: 'va@example.com',
  displayName: 'VA User',
  username: 'va_user',
  roles: [Role.VRATARTHI],
  language: 'EN',
  gender: null,
  dob: null,
  avatarUrl: null,
  emailVerifiedAt: new Date(),
  onboardingCompletedAt: new Date(),
};

const VM_USER: SessionUser = {
  id: 'vm-1',
  email: 'vm@example.com',
  displayName: 'VM User',
  username: 'vm_user',
  roles: [Role.VRATMITRA],
  language: 'EN',
  gender: null,
  dob: null,
  avatarUrl: null,
  emailVerifiedAt: new Date(),
  onboardingCompletedAt: new Date(),
};

const OTHER_USER: SessionUser = { ...VA_USER, id: 'other-1' };

const SENTENCE_ID = 'sentence-1';
const WEAKNESS_ID = 'weakness-1';
const JOURNEY_ID = 'journey-1';

const ACTIVE_JOURNEY_SLIM = {
  id: JOURNEY_ID,
  vratarthiId: VA_USER.id,
  vmAssignments: [],
  globalVmRelationship: null,
};

const JOURNEY_SLIM_WITH_VM = {
  id: JOURNEY_ID,
  vratarthiId: VA_USER.id,
  vmAssignments: [{ vmId: VM_USER.id, state: VmRelationshipState.ACTIVE }],
  globalVmRelationship: null,
};

const makeJourneyDetail = (state: JourneyState = JourneyState.ACTIVE) => ({
  id: JOURNEY_ID,
  title: 'My Journey',
  state,
  vratarthiId: 'va-1',
  sentenceId: SENTENCE_ID,
  startedAt: new Date(),
  completedAt: null,
  pausedAt: null,
  dormantSince: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  sentence: { id: SENTENCE_ID, textEn: 'Test sentence', textMr: null, subvirtue: { id: 'sv-1', nameEn: 'SV', nameMr: null, virtue: { id: 'v-1', nameEn: 'Virtue', nameMr: null } } },
  weaknesses: [],
  vmAssignments: [],
  globalVmRelationship: null,
  ercCounts: { exposures: { total: 0, active: 0, approved: 0 }, resolutions: { total: 0, active: 0, approved: 0 }, challenges: { total: 0, active: 0, approved: 0 } },
});

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findActiveForSentence: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(makeJourneyDetail()),
    findAll: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    findById: vi.fn().mockResolvedValue(makeJourneyDetail()),
    updateState: vi.fn().mockResolvedValue({ id: JOURNEY_ID, state: JourneyState.PAUSED }),
    updateTitle: vi.fn().mockResolvedValue({ id: JOURNEY_ID, title: 'New Title' }),
    setCompleted: vi.fn().mockResolvedValue({ id: JOURNEY_ID, state: JourneyState.COMPLETED, completedAt: new Date() }),
    buildJourneySlim: vi.fn().mockReturnValue(ACTIVE_JOURNEY_SLIM),
    ...overrides,
  };
}

function makeNotificationsRepo() {
  return { create: vi.fn().mockResolvedValue({}) };
}

function makeService(repo: ReturnType<typeof makeRepo>, notifRepo: ReturnType<typeof makeNotificationsRepo> = makeNotificationsRepo()) {
  const service = Object.create(JourneysService.prototype) as JourneysService;
  const s = service as unknown as Record<string, unknown>;
  s['journeysRepository'] = repo;
  s['notificationsRepository'] = notifRepo;
  s['prisma'] = { sentence: { findUnique: vi.fn().mockResolvedValue({ textEn: 'Test sentence' }) } };
  return service;
}

function makeServiceWithVm(notifRepo: ReturnType<typeof makeNotificationsRepo> = makeNotificationsRepo()) {
  const repo = makeRepo({
    findById: vi.fn().mockResolvedValue({ ...makeJourneyDetail(), vmAssignments: JOURNEY_SLIM_WITH_VM.vmAssignments }),
    buildJourneySlim: vi.fn().mockReturnValue(JOURNEY_SLIM_WITH_VM),
  });
  return { service: makeService(repo, notifRepo), repo, notifRepo };
}

// ─── createJourney ────────────────────────────────────────────────────────────

describe('JourneysService — createJourney', () => {
  it('AUTH MATRIX POSITIVE: VA can create a journey', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    const result = await service.createJourney(VA_USER, { sentenceId: SENTENCE_ID, weaknessId: WEAKNESS_ID });
    expect(repo.create).toHaveBeenCalled();
    expect(result.id).toBe(JOURNEY_ID);
  });

  it('NEGATIVE: throws JourneyConflictException when active journey exists for same sentence', async () => {
    const repo = makeRepo({
      findActiveForSentence: vi.fn().mockResolvedValue({ id: 'existing-1', state: JourneyState.ACTIVE }),
    });
    const service = makeService(repo);
    await expect(service.createJourney(VA_USER, { sentenceId: SENTENCE_ID, weaknessId: WEAKNESS_ID }))
      .rejects.toThrow(JourneyConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('POSITIVE: allows create when only completed journey exists for same sentence', async () => {
    const repo = makeRepo({ findActiveForSentence: vi.fn().mockResolvedValue(null) });
    const service = makeService(repo);
    await expect(service.createJourney(VA_USER, { sentenceId: SENTENCE_ID, weaknessId: WEAKNESS_ID }))
      .resolves.not.toThrow();
    expect(repo.create).toHaveBeenCalled();
  });
});

// ─── updateState ─────────────────────────────────────────────────────────────

describe('JourneysService — updateState', () => {
  it('POSITIVE: ACTIVE → PAUSED succeeds', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    await service.updateState(VA_USER, JOURNEY_ID, 'pause');
    expect(repo.updateState).toHaveBeenCalledWith(JOURNEY_ID, JourneyState.PAUSED);
  });

  it('POSITIVE: PAUSED → ACTIVE succeeds', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(makeJourneyDetail(JourneyState.PAUSED)) });
    const service = makeService(repo);
    await service.updateState(VA_USER, JOURNEY_ID, 'resume');
    expect(repo.updateState).toHaveBeenCalledWith(JOURNEY_ID, JourneyState.ACTIVE);
  });

  it('NEGATIVE: PAUSED → PAUSED throws InvalidStateTransition', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(makeJourneyDetail(JourneyState.PAUSED)) });
    const service = makeService(repo);
    await expect(service.updateState(VA_USER, JOURNEY_ID, 'pause'))
      .rejects.toThrow(InvalidStateTransitionException);
  });

  it('NEGATIVE: ACTIVE → ACTIVE throws InvalidStateTransition', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    await expect(service.updateState(VA_USER, JOURNEY_ID, 'resume'))
      .rejects.toThrow(InvalidStateTransitionException);
  });

  it('NEGATIVE: throws AccessDeniedException when user does not own journey', async () => {
    const repo = makeRepo({
      buildJourneySlim: vi.fn().mockReturnValue({ ...ACTIVE_JOURNEY_SLIM, vratarthiId: 'va-1' }),
    });
    const service = makeService(repo);
    await expect(service.updateState(OTHER_USER, JOURNEY_ID, 'pause'))
      .rejects.toThrow(AccessDeniedException);
  });
});

// ─── getJourney ───────────────────────────────────────────────────────────────

describe('JourneysService — getJourney', () => {
  it('POSITIVE: VA views own journey', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    const result = await service.getJourney(VA_USER, JOURNEY_ID);
    expect(result.id).toBe(JOURNEY_ID);
  });

  it('NEGATIVE: throws AccessDeniedException when user does not own journey and is not VM', async () => {
    const repo = makeRepo({
      buildJourneySlim: vi.fn().mockReturnValue({ ...ACTIVE_JOURNEY_SLIM, vratarthiId: 'va-1' }),
    });
    const service = makeService(repo);
    await expect(service.getJourney(OTHER_USER, JOURNEY_ID))
      .rejects.toThrow(AccessDeniedException);
  });
});

// ─── submitCompletion ─────────────────────────────────────────────────────────

describe('JourneysService — submitCompletion', () => {
  it('AUTH MATRIX POSITIVE: VA self-approves completion when no VM assigned → state COMPLETED', async () => {
    const repo = makeRepo();
    const notifRepo = makeNotificationsRepo();
    const service = makeService(repo, notifRepo);
    const result = await service.submitCompletion(VA_USER, JOURNEY_ID);
    expect(repo.setCompleted).toHaveBeenCalledWith(JOURNEY_ID);
    expect((result as { state: JourneyState }).state).toBe(JourneyState.COMPLETED);
  });

  it('AUTH MATRIX POSITIVE: VA submits when VM assigned → notification to VM, returns pending_vm_approval', async () => {
    const notifRepo = makeNotificationsRepo();
    const { service } = makeServiceWithVm(notifRepo);
    const result = await service.submitCompletion(VA_USER, JOURNEY_ID);
    expect((result as { status: string }).status).toBe('pending_vm_approval');
    expect(notifRepo.create).toHaveBeenCalledWith(VM_USER.id, VA_USER.id, 'JOURNEY_COMPLETION_SUBMITTED', 'journey', JOURNEY_ID);
  });

  it('AUTH MATRIX NEGATIVE: VM cannot call submitCompletion → 403', async () => {
    const service = makeService(makeRepo());
    await expect(service.submitCompletion(VM_USER, JOURNEY_ID))
      .rejects.toThrow(AccessDeniedException);
  });

  it('AUTH MATRIX NEGATIVE: VA who does not own the journey → 403', async () => {
    const service = makeService(makeRepo());
    await expect(service.submitCompletion(OTHER_USER, JOURNEY_ID))
      .rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: already COMPLETED journey → 409 InvalidStateTransitionException', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(makeJourneyDetail(JourneyState.COMPLETED)) });
    const service = makeService(repo);
    await expect(service.submitCompletion(VA_USER, JOURNEY_ID))
      .rejects.toThrow(InvalidStateTransitionException);
  });

  it('NEGATIVE: PAUSED journey cannot be submitted for completion → 409', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(makeJourneyDetail(JourneyState.PAUSED)) });
    const service = makeService(repo);
    await expect(service.submitCompletion(VA_USER, JOURNEY_ID))
      .rejects.toThrow(InvalidStateTransitionException);
  });
});

// ─── approveCompletion ────────────────────────────────────────────────────────

describe('JourneysService — approveCompletion', () => {
  it('AUTH MATRIX POSITIVE: VM with active assignment approves completion → state COMPLETED + notification to VA', async () => {
    const notifRepo = makeNotificationsRepo();
    const { service, repo } = makeServiceWithVm(notifRepo);
    const result = await service.approveCompletion(VM_USER, JOURNEY_ID);
    expect(repo.setCompleted).toHaveBeenCalledWith(JOURNEY_ID);
    expect((result as { state: JourneyState }).state).toBe(JourneyState.COMPLETED);
    expect(notifRepo.create).toHaveBeenCalledWith(VA_USER.id, VM_USER.id, 'JOURNEY_COMPLETION_APPROVED', 'journey', JOURNEY_ID);
  });

  it('AUTH MATRIX NEGATIVE: VA cannot call approveCompletion → 403', async () => {
    const { service } = makeServiceWithVm();
    await expect(service.approveCompletion(VA_USER, JOURNEY_ID))
      .rejects.toThrow(AccessDeniedException);
  });

  it('AUTH MATRIX NEGATIVE: non-assigned VM cannot approve → 403', async () => {
    const { service } = makeServiceWithVm();
    const OTHER_VM = { ...VM_USER, id: 'other-vm-1' };
    await expect(service.approveCompletion(OTHER_VM, JOURNEY_ID))
      .rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: already COMPLETED journey → 409 InvalidStateTransitionException', async () => {
    const notifRepo = makeNotificationsRepo();
    const { service, repo } = makeServiceWithVm(notifRepo);
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ ...makeJourneyDetail(JourneyState.COMPLETED), vmAssignments: JOURNEY_SLIM_WITH_VM.vmAssignments });
    await expect(service.approveCompletion(VM_USER, JOURNEY_ID))
      .rejects.toThrow(InvalidStateTransitionException);
  });
});
