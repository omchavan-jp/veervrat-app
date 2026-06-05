import { describe, it, expect, vi } from 'vitest';
import { ErcStatus, Role } from '@prisma/client';
import { ErcService } from './erc.service';
import {
  ErcAlreadySelectedException,
  InvalidErcStatusTransitionException,
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const VA: SessionUser = {
  id: 'va-1', email: 'va@x.com', displayName: 'VA', username: 'va',
  roles: [Role.VRATARTHI], language: 'EN', gender: null, dob: null,
  emailVerifiedAt: new Date(), onboardingCompletedAt: new Date(),
};
const OTHER_VA: SessionUser = { ...VA, id: 'other-1' };
const JOURNEY_ID = 'j-1';
const ITEM_ID = 'item-1';
const POOL_ID = 'pool-1';

const JOURNEY_SLIM = { id: JOURNEY_ID, vratarthiId: 'va-1', vmAssignments: [], globalVmRelationship: null };
const JOURNEY_DETAIL = { ...JOURNEY_SLIM, state: 'ACTIVE', weaknesses: [], ercCounts: { exposures: { total: 0, active: 0, approved: 0 }, resolutions: { total: 0, active: 0, approved: 0 }, challenges: { total: 0, active: 0, approved: 0 } }, sentence: { id: 's-1', textEn: 'T', textMr: null, subvirtue: { id: 'sv-1', nameEn: 'SV', nameMr: null, virtue: { id: 'v-1', nameEn: 'V', nameMr: null }, sentences: [] } }, deletedAt: null, startedAt: new Date(), completedAt: null, pausedAt: null, dormantSince: null, thresholdExposures: 1, thresholdResolutions: 1, createdAt: new Date(), updatedAt: new Date(), title: 'J', sentenceId: 's-1', vratarthiId: 'va-1' };

const makeItem = (status: ErcStatus, isDeactivated = false) => ({
  id: ITEM_ID, journeyId: JOURNEY_ID, status, isDeactivated, isCustom: false,
  titleEn: 'T', descriptionEn: null, startedAt: null, submittedAt: null, approvedAt: null,
  tier: 'LOCAL' as const,
});

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    getPool: vi.fn().mockResolvedValue([]),
    listJourneyItems: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.NOT_STARTED)),
    findByPoolItemId: vi.fn().mockResolvedValue(null),
    selectPoolItem: vi.fn().mockResolvedValue(makeItem(ErcStatus.NOT_STARTED)),
    updateStatus: vi.fn().mockImplementation((_id, status) => makeItem(status)),
    setDeactivated: vi.fn().mockImplementation((_id, v) => makeItem(ErcStatus.NOT_STARTED, v)),
    remove: vi.fn().mockResolvedValue(undefined),
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

function makeService(ercRepo: ReturnType<typeof makeRepo>, jRepo: ReturnType<typeof makeJourneyRepo>) {
  const service = Object.create(ErcService.prototype) as ErcService;
  const s = service as unknown as Record<string, unknown>;
  s['ercRepository'] = ercRepo;
  s['journeysRepository'] = jRepo;
  return service;
}

describe('ErcService — selectItem', () => {
  it('AUTH MATRIX POSITIVE: VA owner can select pool item', async () => {
    const ercRepo = makeRepo();
    const service = makeService(ercRepo, makeJourneyRepo());
    await service.selectItem(VA, JOURNEY_ID, POOL_ID, 'exposure');
    expect(ercRepo.selectPoolItem).toHaveBeenCalledWith(JOURNEY_ID, POOL_ID, 'exposure');
  });

  it('AUTH MATRIX NEGATIVE: non-owner VA gets 403', async () => {
    const service = makeService(makeRepo(), makeJourneyRepo());
    await expect(service.selectItem(OTHER_VA, JOURNEY_ID, POOL_ID, 'exposure'))
      .rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: throws ErcAlreadySelectedException when already selected', async () => {
    const ercRepo = makeRepo({ findByPoolItemId: vi.fn().mockResolvedValue({ id: ITEM_ID }) });
    const service = makeService(ercRepo, makeJourneyRepo());
    await expect(service.selectItem(VA, JOURNEY_ID, POOL_ID, 'exposure'))
      .rejects.toThrow(ErcAlreadySelectedException);
  });
});

describe('ErcService — updateStatus', () => {
  it('POSITIVE: NOT_STARTED → IN_PROGRESS succeeds', async () => {
    const ercRepo = makeRepo();
    const service = makeService(ercRepo, makeJourneyRepo());
    await service.updateStatus(VA, JOURNEY_ID, ITEM_ID, 'in_progress', 'exposure');
    expect(ercRepo.updateStatus).toHaveBeenCalledWith(ITEM_ID, ErcStatus.IN_PROGRESS, 'exposure');
  });

  it('NEGATIVE: IN_PROGRESS → APPROVED (skipping SUBMITTED) throws InvalidTransition', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.IN_PROGRESS)) });
    const service = makeService(ercRepo, makeJourneyRepo());
    await expect(service.updateStatus(VA, JOURNEY_ID, ITEM_ID, 'approved', 'exposure'))
      .rejects.toThrow(InvalidErcStatusTransitionException);
  });

  it('POSITIVE: SUBMITTED → APPROVED self-approve when no VM', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.SUBMITTED)) });
    const service = makeService(ercRepo, makeJourneyRepo());
    await service.updateStatus(VA, JOURNEY_ID, ITEM_ID, 'approved', 'exposure');
    expect(ercRepo.updateStatus).toHaveBeenCalledWith(ITEM_ID, ErcStatus.APPROVED, 'exposure');
  });

  it('NEGATIVE: REVISIT always throws AccessDenied (VM-only, item 15)', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.SUBMITTED)) });
    const service = makeService(ercRepo, makeJourneyRepo());
    await expect(service.updateStatus(VA, JOURNEY_ID, ITEM_ID, 'revisit', 'exposure'))
      .rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: deactivated item cannot change status', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.NOT_STARTED, true)) });
    const service = makeService(ercRepo, makeJourneyRepo());
    await expect(service.updateStatus(VA, JOURNEY_ID, ITEM_ID, 'in_progress', 'exposure'))
      .rejects.toThrow(InvalidErcStatusTransitionException);
  });
});

describe('ErcService — deactivate / reactivate', () => {
  it('POSITIVE: deactivate sets isDeactivated=true', async () => {
    const ercRepo = makeRepo();
    const service = makeService(ercRepo, makeJourneyRepo());
    await service.deactivate(VA, JOURNEY_ID, ITEM_ID, 'exposure');
    expect(ercRepo.setDeactivated).toHaveBeenCalledWith(ITEM_ID, true, 'exposure');
  });

  it('POSITIVE: reactivate sets isDeactivated=false', async () => {
    const ercRepo = makeRepo();
    const service = makeService(ercRepo, makeJourneyRepo());
    await service.reactivate(VA, JOURNEY_ID, ITEM_ID, 'exposure');
    expect(ercRepo.setDeactivated).toHaveBeenCalledWith(ITEM_ID, false, 'exposure');
  });
});
