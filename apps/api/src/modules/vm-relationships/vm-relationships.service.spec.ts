import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { VmRelationshipsService } from './vm-relationships.service';
import {
  EntityNotFoundException,
  AccessDeniedException,
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

const MODERATOR: SessionUser = {
  ...VA, id: 'mod-1', roles: [Role.MODERATOR],
};

const ACTIVE_RELATIONSHIP = {
  id: 'rel-1',
  vratarthiId: VA.id,
  vmId: VM.id,
  state: 'ACTIVE',
  acceptedAt: new Date(),
  endedAt: null,
  createdAt: new Date(),
};

const AFFECTED_JOURNEYS = [
  { journeyId: 'j-1', journeyTitle: 'Journey 1' },
  { journeyId: 'j-2', journeyTitle: 'Journey 2' },
];

const ACTIVE_ASSIGNMENT = {
  id: 'assign-1',
  journeyId: 'j-1',
  vmId: VM.id,
  state: 'ACTIVE',
  acceptedAt: new Date(),
  endedAt: null,
  createdAt: new Date(),
};

function makeVmRelRepo(overrides: Record<string, unknown> = {}) {
  return {
    findActiveGlobalVm: vi.fn().mockResolvedValue(ACTIVE_RELATIONSHIP),
    endGlobalVm: vi.fn().mockResolvedValue({ ...ACTIVE_RELATIONSHIP, endedAt: new Date() }),
    findActiveJourneyAssignmentsForVm: vi.fn().mockResolvedValue(AFFECTED_JOURNEYS),
    createGlobalRelationship: vi.fn().mockResolvedValue(ACTIVE_RELATIONSHIP),
    createJourneyAssignment: vi.fn().mockResolvedValue(ACTIVE_ASSIGNMENT),
    findActiveJourneyAssignment: vi.fn().mockResolvedValue(ACTIVE_ASSIGNMENT),
    endJourneyAssignment: vi.fn().mockResolvedValue({ ...ACTIVE_ASSIGNMENT, endedAt: new Date() }),
    ...overrides,
  };
}

function makeJourneysRepo(overrides: Record<string, unknown> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'j-1', vratarthiId: VA.id, vmAssignments: [ACTIVE_ASSIGNMENT] }),
    buildJourneySlim: vi.fn().mockReturnValue({ id: 'j-1', vratarthiId: VA.id }),
    ...overrides,
  };
}

function makeService(
  vmRelRepo = makeVmRelRepo(),
  journeysRepo = makeJourneysRepo(),
) {
  const svc = Object.create(VmRelationshipsService.prototype) as VmRelationshipsService;
  const s = svc as unknown as Record<string, unknown>;
  s['vmRelationshipsRepository'] = vmRelRepo;
  s['journeysRepository'] = journeysRepo;
  return svc;
}

// ─── removeGlobalVm ───────────────────────────────────────────────────────────

describe('VmRelationshipsService — removeGlobalVm', () => {
  it('AUTH MATRIX POSITIVE: VA with active global VM can remove it → returns migration payload', async () => {
    const svc = makeService();
    const result = await svc.removeGlobalVm(VA);
    expect(result.removedVmId).toBe(VM.id);
    expect(result.affectedJourneys).toEqual(AFFECTED_JOURNEYS);
  });

  it('AUTH MATRIX NEGATIVE: VA with no active global VM → 404', async () => {
    const repo = makeVmRelRepo({ findActiveGlobalVm: vi.fn().mockResolvedValue(null) });
    const svc = makeService(repo);
    await expect(svc.removeGlobalVm(VA)).rejects.toThrow(EntityNotFoundException);
  });

  it('AUTH MATRIX NEGATIVE: non-VA user cannot call removeGlobalVm → 403', async () => {
    const svc = makeService();
    await expect(svc.removeGlobalVm(MODERATOR)).rejects.toThrow(AccessDeniedException);
  });

  it('POSITIVE: migration payload includes all affected journey assignments', async () => {
    const svc = makeService();
    const result = await svc.removeGlobalVm(VA);
    expect(result.affectedJourneys).toHaveLength(2);
    expect(result.affectedJourneys[0].journeyId).toBe('j-1');
    expect(result.affectedJourneys[1].journeyId).toBe('j-2');
  });
});

// ─── withdrawJourneyVm ────────────────────────────────────────────────────────

describe('VmRelationshipsService — withdrawJourneyVm', () => {
  it('AUTH MATRIX POSITIVE: VM can withdraw from their assigned journey', async () => {
    const repo = makeVmRelRepo();
    const svc = makeService(repo);
    const result = await svc.withdrawJourneyVm(VM, 'j-1');
    expect(result.journeyId).toBe('j-1');
    expect(result.vmId).toBe(VM.id);
    expect(repo.endJourneyAssignment).toHaveBeenCalledWith(ACTIVE_ASSIGNMENT.id);
  });

  it('AUTH MATRIX NEGATIVE: VM not assigned to journey → 403', async () => {
    const repo = makeVmRelRepo({ findActiveJourneyAssignment: vi.fn().mockResolvedValue(null) });
    const svc = makeService(repo);
    await expect(svc.withdrawJourneyVm(VM, 'j-1')).rejects.toThrow(AccessDeniedException);
  });

  it('AUTH MATRIX NEGATIVE: non-VM user cannot call withdrawJourneyVm → 403', async () => {
    const svc = makeService();
    await expect(svc.withdrawJourneyVm(VA, 'j-1')).rejects.toThrow(AccessDeniedException);
  });
});
