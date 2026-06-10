import { describe, it, expect, vi } from 'vitest';
import { CheckinStatus, ErcStatus, Role, VmRelationshipState } from '@prisma/client';
import { ResolutionCheckinsService } from './resolution-checkins.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
  InvalidCheckinStateException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const VA: SessionUser = {
  id: 'va-1', email: 'va@x.com', displayName: 'VA', username: 'va',
  roles: [Role.VRATARTHI], language: 'EN', gender: null, dob: null, avatarUrl: null,
  emailVerifiedAt: new Date(), onboardingCompletedAt: new Date(),
};
const OTHER_VA: SessionUser = { ...VA, id: 'other-1' };
const VM: SessionUser = {
  id: 'vm-1', email: 'vm@x.com', displayName: 'VM', username: 'vm',
  roles: [Role.VRATMITRA], language: 'EN', gender: null, dob: null, avatarUrl: null,
  emailVerifiedAt: new Date(), onboardingCompletedAt: new Date(),
};
const STRANGER: SessionUser = { ...OTHER_VA, id: 'stranger-1' };

const JOURNEY_ID = 'j-1';
const RESOLUTION_ID = 'r-1';

const JOURNEY_SLIM = {
  id: JOURNEY_ID,
  vratarthiId: VA.id,
  vmAssignments: [{ vmId: VM.id, state: VmRelationshipState.ACTIVE }],
  globalVmRelationship: null,
};

const JOURNEY_DETAIL = {
  ...JOURNEY_SLIM,
  state: 'ACTIVE',
  weaknesses: [],
  ercCounts: {
    exposures: { total: 0, active: 0, approved: 0 },
    resolutions: { total: 0, active: 0, approved: 0 },
    challenges: { total: 0, active: 0, approved: 0 },
  },
  sentence: {
    id: 's-1', textEn: 'T', textMr: null,
    subvirtue: { id: 'sv-1', nameEn: 'SV', nameMr: null, virtue: { id: 'v-1', nameEn: 'V', nameMr: null }, sentences: [] },
  },
  deletedAt: null,
  startedAt: new Date(), completedAt: null, pausedAt: null, dormantSince: null,
  thresholdExposures: 1, thresholdResolutions: 1,
  createdAt: new Date(), updatedAt: new Date(),
  title: 'J', sentenceId: 's-1', vratarthiId: VA.id,
};

const RESOLUTION_IN_PROGRESS = {
  id: RESOLUTION_ID,
  journeyId: JOURNEY_ID,
  status: ErcStatus.IN_PROGRESS,
  isDeactivated: false,
};

const CHECKIN_RECORD = {
  id: 'c-1',
  journeyResolutionId: RESOLUTION_ID,
  status: CheckinStatus.DONE,
  note: null,
  checkedInAt: new Date(),
  createdAt: new Date(),
};

function makeCheckinsRepo(overrides: Record<string, unknown> = {}) {
  return {
    findResolutionById: vi.fn().mockResolvedValue(RESOLUTION_IN_PROGRESS),
    create: vi.fn().mockResolvedValue(CHECKIN_RECORD),
    listWithStreak: vi.fn().mockResolvedValue({ checkins: [CHECKIN_RECORD], streak: 1 }),
    ...overrides,
  };
}

function makeJourneyRepo(overrides: Record<string, unknown> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(JOURNEY_DETAIL),
    buildJourneySlim: vi.fn().mockReturnValue(JOURNEY_SLIM),
    ...overrides,
  };
}

function makeService(
  checkinsRepo: ReturnType<typeof makeCheckinsRepo>,
  journeyRepo: ReturnType<typeof makeJourneyRepo>,
) {
  const svc = Object.create(ResolutionCheckinsService.prototype) as ResolutionCheckinsService;
  const s = svc as unknown as Record<string, unknown>;
  s['checkinsRepository'] = checkinsRepo;
  s['journeysRepository'] = journeyRepo;
  return svc;
}

// ─── logCheckin ───────────────────────────────────────────────────────────────

describe('ResolutionCheckinsService — logCheckin', () => {
  it('AUTH MATRIX POSITIVE: VA owner can log check-in on in_progress resolution', async () => {
    const checkinsRepo = makeCheckinsRepo();
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await svc.logCheckin(VA, JOURNEY_ID, RESOLUTION_ID, CheckinStatus.DONE);
    expect(checkinsRepo.create).toHaveBeenCalledWith(RESOLUTION_ID, CheckinStatus.DONE, undefined);
  });

  it('AUTH MATRIX NEGATIVE: non-owner VA gets 403', async () => {
    const svc = makeService(makeCheckinsRepo(), makeJourneyRepo());
    await expect(svc.logCheckin(OTHER_VA, JOURNEY_ID, RESOLUTION_ID, CheckinStatus.DONE))
      .rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: throws InvalidCheckinStateException when resolution is NOT_STARTED', async () => {
    const checkinsRepo = makeCheckinsRepo({
      findResolutionById: vi.fn().mockResolvedValue({ ...RESOLUTION_IN_PROGRESS, status: ErcStatus.NOT_STARTED }),
    });
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await expect(svc.logCheckin(VA, JOURNEY_ID, RESOLUTION_ID, CheckinStatus.DONE))
      .rejects.toThrow(InvalidCheckinStateException);
  });

  it('NEGATIVE: throws InvalidCheckinStateException when resolution is SUBMITTED', async () => {
    const checkinsRepo = makeCheckinsRepo({
      findResolutionById: vi.fn().mockResolvedValue({ ...RESOLUTION_IN_PROGRESS, status: ErcStatus.SUBMITTED }),
    });
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await expect(svc.logCheckin(VA, JOURNEY_ID, RESOLUTION_ID, CheckinStatus.DONE))
      .rejects.toThrow(InvalidCheckinStateException);
  });

  it('NEGATIVE: throws InvalidCheckinStateException when resolution is APPROVED', async () => {
    const checkinsRepo = makeCheckinsRepo({
      findResolutionById: vi.fn().mockResolvedValue({ ...RESOLUTION_IN_PROGRESS, status: ErcStatus.APPROVED }),
    });
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await expect(svc.logCheckin(VA, JOURNEY_ID, RESOLUTION_ID, CheckinStatus.DONE))
      .rejects.toThrow(InvalidCheckinStateException);
  });

  it('NEGATIVE: throws InvalidCheckinStateException when resolution is deactivated (even if IN_PROGRESS)', async () => {
    const checkinsRepo = makeCheckinsRepo({
      findResolutionById: vi.fn().mockResolvedValue({ ...RESOLUTION_IN_PROGRESS, isDeactivated: true }),
    });
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await expect(svc.logCheckin(VA, JOURNEY_ID, RESOLUTION_ID, CheckinStatus.DONE))
      .rejects.toThrow(InvalidCheckinStateException);
  });

  it('NEGATIVE: throws EntityNotFoundException when resolution not found', async () => {
    const checkinsRepo = makeCheckinsRepo({
      findResolutionById: vi.fn().mockResolvedValue(null),
    });
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await expect(svc.logCheckin(VA, JOURNEY_ID, RESOLUTION_ID, CheckinStatus.DONE))
      .rejects.toThrow(EntityNotFoundException);
  });

  it('NEGATIVE: throws EntityNotFoundException when resolution belongs to a different journey', async () => {
    const checkinsRepo = makeCheckinsRepo({
      findResolutionById: vi.fn().mockResolvedValue({ ...RESOLUTION_IN_PROGRESS, journeyId: 'other-journey' }),
    });
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await expect(svc.logCheckin(VA, JOURNEY_ID, RESOLUTION_ID, CheckinStatus.DONE))
      .rejects.toThrow(EntityNotFoundException);
  });

  it('POSITIVE: passes note through to repository', async () => {
    const checkinsRepo = makeCheckinsRepo();
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await svc.logCheckin(VA, JOURNEY_ID, RESOLUTION_ID, CheckinStatus.PARTIAL, 'Half done');
    expect(checkinsRepo.create).toHaveBeenCalledWith(RESOLUTION_ID, CheckinStatus.PARTIAL, 'Half done');
  });
});

// ─── listCheckins ─────────────────────────────────────────────────────────────

describe('ResolutionCheckinsService — listCheckins', () => {
  it('POSITIVE: VA owner gets history + streak', async () => {
    const checkinsRepo = makeCheckinsRepo();
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    const result = await svc.listCheckins(VA, JOURNEY_ID, RESOLUTION_ID);
    expect(result).toEqual({ checkins: [CHECKIN_RECORD], streak: 1 });
  });

  it('POSITIVE: assigned VM gets history + streak', async () => {
    const checkinsRepo = makeCheckinsRepo();
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    const result = await svc.listCheckins(VM, JOURNEY_ID, RESOLUTION_ID);
    expect(result).toEqual({ checkins: [CHECKIN_RECORD], streak: 1 });
  });

  it('NEGATIVE: non-participant gets 403', async () => {
    const svc = makeService(makeCheckinsRepo(), makeJourneyRepo());
    await expect(svc.listCheckins(STRANGER, JOURNEY_ID, RESOLUTION_ID))
      .rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: throws EntityNotFoundException when resolution not found', async () => {
    const checkinsRepo = makeCheckinsRepo({
      findResolutionById: vi.fn().mockResolvedValue(null),
    });
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await expect(svc.listCheckins(VA, JOURNEY_ID, RESOLUTION_ID))
      .rejects.toThrow(EntityNotFoundException);
  });

  it('NEGATIVE: throws EntityNotFoundException when resolution belongs to different journey', async () => {
    const checkinsRepo = makeCheckinsRepo({
      findResolutionById: vi.fn().mockResolvedValue({ ...RESOLUTION_IN_PROGRESS, journeyId: 'other-journey' }),
    });
    const svc = makeService(checkinsRepo, makeJourneyRepo());
    await expect(svc.listCheckins(VA, JOURNEY_ID, RESOLUTION_ID))
      .rejects.toThrow(EntityNotFoundException);
  });
});
