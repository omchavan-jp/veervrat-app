import { describe, it, expect, vi } from 'vitest';
import { ErcStatus, Role, VmRelationshipState } from '@prisma/client';
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
const VM: SessionUser = {
  id: 'vm-1', email: 'vm@x.com', displayName: 'VM', username: 'vm',
  roles: [Role.VRATMITRA], language: 'EN', gender: null, dob: null,
  emailVerifiedAt: new Date(), onboardingCompletedAt: new Date(),
};
const OTHER_VM: SessionUser = { ...VM, id: 'other-vm-1' };
const OTHER_VA: SessionUser = { ...VA, id: 'other-1' };
const JOURNEY_ID = 'j-1';
const ITEM_ID = 'item-1';
const POOL_ID = 'pool-1';

const JOURNEY_SLIM = { id: JOURNEY_ID, vratarthiId: VA.id, vmAssignments: [], globalVmRelationship: null };
const JOURNEY_SLIM_WITH_VM = {
  id: JOURNEY_ID, vratarthiId: VA.id,
  vmAssignments: [{ vmId: VM.id, state: VmRelationshipState.ACTIVE }],
  globalVmRelationship: null,
};
const JOURNEY_DETAIL = {
  ...JOURNEY_SLIM, state: 'ACTIVE', weaknesses: [], vratarthiId: VA.id,
  ercCounts: { exposures: { total: 0, active: 0, approved: 0 }, resolutions: { total: 0, active: 0, approved: 0 }, challenges: { total: 0, active: 0, approved: 0 } },
  sentence: { id: 's-1', textEn: 'T', textMr: null, subvirtue: { id: 'sv-1', nameEn: 'SV', nameMr: null, virtue: { id: 'v-1', nameEn: 'V', nameMr: null }, sentences: [] } },
  deletedAt: null, startedAt: new Date(), completedAt: null, pausedAt: null, dormantSince: null,
  thresholdExposures: 1, thresholdResolutions: 1, createdAt: new Date(), updatedAt: new Date(),
  title: 'J', sentenceId: 's-1',
};
const JOURNEY_DETAIL_WITH_VM = { ...JOURNEY_DETAIL, vmAssignments: JOURNEY_SLIM_WITH_VM.vmAssignments };

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

function makeNotificationsRepo() {
  return { create: vi.fn().mockResolvedValue({}) };
}

function makeService(
  ercRepo: ReturnType<typeof makeRepo> = makeRepo(),
  jRepo: ReturnType<typeof makeJourneyRepo> = makeJourneyRepo(),
  notifRepo: ReturnType<typeof makeNotificationsRepo> = makeNotificationsRepo(),
) {
  const service = Object.create(ErcService.prototype) as ErcService;
  const s = service as unknown as Record<string, unknown>;
  s['ercRepository'] = ercRepo;
  s['journeysRepository'] = jRepo;
  s['notificationsRepository'] = notifRepo;
  return service;
}

function makeServiceWithVm(
  ercRepo: ReturnType<typeof makeRepo> = makeRepo(),
  notifRepo: ReturnType<typeof makeNotificationsRepo> = makeNotificationsRepo(),
) {
  return makeService(
    ercRepo,
    { findById: vi.fn().mockResolvedValue(JOURNEY_DETAIL_WITH_VM), buildJourneySlim: vi.fn().mockReturnValue(JOURNEY_SLIM_WITH_VM) },
    notifRepo,
  );
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

  it('AUTH MATRIX NEGATIVE: VA cannot set REVISIT via PATCH /status → 403', async () => {
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

// ─── approveItem ──────────────────────────────────────────────────────────────

describe('ErcService — approveItem', () => {
  it('AUTH MATRIX POSITIVE: VM with active assignment can approve SUBMITTED item → APPROVED + notification written', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.SUBMITTED)) });
    const notifRepo = makeNotificationsRepo();
    const service = makeServiceWithVm(ercRepo, notifRepo);
    const result = await service.approveItem(VM, JOURNEY_ID, ITEM_ID, 'exposure');
    expect(result.status).toBe(ErcStatus.APPROVED);
    expect(notifRepo.create).toHaveBeenCalledWith(VA.id, VM.id, 'ERC_CLOSURE_APPROVED', 'exposure', ITEM_ID);
  });

  it('AUTH MATRIX POSITIVE: VA self-approves (no VM assigned) via approveItem → APPROVED + notification', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.SUBMITTED)) });
    const notifRepo = makeNotificationsRepo();
    const service = makeService(ercRepo, makeJourneyRepo(), notifRepo);
    const result = await service.approveItem(VA, JOURNEY_ID, ITEM_ID, 'exposure');
    expect(result.status).toBe(ErcStatus.APPROVED);
    expect(notifRepo.create).toHaveBeenCalled();
  });

  it('AUTH MATRIX NEGATIVE: VA cannot approve when VM is assigned → 403', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.SUBMITTED)) });
    const service = makeServiceWithVm(ercRepo);
    await expect(service.approveItem(VA, JOURNEY_ID, ITEM_ID, 'exposure'))
      .rejects.toThrow(AccessDeniedException);
  });

  it('AUTH MATRIX NEGATIVE: non-assigned VM cannot approve → 403', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.SUBMITTED)) });
    const service = makeServiceWithVm(ercRepo);
    await expect(service.approveItem(OTHER_VM, JOURNEY_ID, ITEM_ID, 'exposure'))
      .rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: item not SUBMITTED → 409 InvalidErcStatusTransitionException', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.IN_PROGRESS)) });
    const service = makeServiceWithVm(ercRepo);
    await expect(service.approveItem(VM, JOURNEY_ID, ITEM_ID, 'exposure'))
      .rejects.toThrow(InvalidErcStatusTransitionException);
  });
});

// ─── revisitItem ──────────────────────────────────────────────────────────────

describe('ErcService — revisitItem', () => {
  it('AUTH MATRIX POSITIVE: VM with active assignment can revisit SUBMITTED item → REVISIT + notification written', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.SUBMITTED)) });
    const notifRepo = makeNotificationsRepo();
    const service = makeServiceWithVm(ercRepo, notifRepo);
    const result = await service.revisitItem(VM, JOURNEY_ID, ITEM_ID, 'exposure');
    expect(result.status).toBe(ErcStatus.REVISIT);
    expect(notifRepo.create).toHaveBeenCalledWith(VA.id, VM.id, 'ERC_RETURNED_FOR_REVISIT', 'exposure', ITEM_ID);
  });

  it('AUTH MATRIX NEGATIVE: VA cannot call revisitItem → 403', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.SUBMITTED)) });
    const service = makeServiceWithVm(ercRepo);
    await expect(service.revisitItem(VA, JOURNEY_ID, ITEM_ID, 'exposure'))
      .rejects.toThrow(AccessDeniedException);
  });

  it('AUTH MATRIX NEGATIVE: non-assigned VM cannot revisit → 403', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.SUBMITTED)) });
    const service = makeServiceWithVm(ercRepo);
    await expect(service.revisitItem(OTHER_VM, JOURNEY_ID, ITEM_ID, 'exposure'))
      .rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: item not SUBMITTED → 409 InvalidErcStatusTransitionException', async () => {
    const ercRepo = makeRepo({ findById: vi.fn().mockResolvedValue(makeItem(ErcStatus.IN_PROGRESS)) });
    const service = makeServiceWithVm(ercRepo);
    await expect(service.revisitItem(VM, JOURNEY_ID, ITEM_ID, 'exposure'))
      .rejects.toThrow(InvalidErcStatusTransitionException);
  });
});
