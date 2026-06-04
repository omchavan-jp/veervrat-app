import { describe, it, expect, vi } from 'vitest';
import { JourneyState, VmRelationshipState } from '@prisma/client';
import { JourneysService } from './journeys.service';
import {
  JourneyConflictException,
  InvalidStateTransitionException,
  AccessDeniedException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';
import { Role } from '@prisma/client';

const VA_USER: SessionUser = {
  id: 'va-1',
  email: 'va@example.com',
  displayName: 'VA User',
  username: 'va_user',
  roles: [Role.VRATARTHI],
  language: 'EN',
  gender: null,
  dob: null,
  emailVerifiedAt: new Date(),
  onboardingCompletedAt: new Date(),
};

const OTHER_USER: SessionUser = { ...VA_USER, id: 'other-1' };

const SENTENCE_ID = 'sentence-1';
const WEAKNESS_ID = 'weakness-1';
const JOURNEY_ID = 'journey-1';

const ACTIVE_JOURNEY_SLIM = {
  id: JOURNEY_ID,
  vratarthiId: 'va-1',
  vmAssignments: [],
  globalVmRelationship: null,
};

const makeJourneyDetail = (state = JourneyState.ACTIVE) => ({
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
    buildJourneySlim: vi.fn().mockReturnValue(ACTIVE_JOURNEY_SLIM),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo>) {
  const service = Object.create(JourneysService.prototype) as JourneysService;
  const s = service as unknown as Record<string, unknown>;
  s['journeysRepository'] = repo;
  s['prisma'] = { sentence: { findUnique: vi.fn().mockResolvedValue({ textEn: 'Test sentence' }) } };
  return service;
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
