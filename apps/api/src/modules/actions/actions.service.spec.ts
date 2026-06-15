import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErcStatus, JourneyState, Role } from '@prisma/client';
import { ActionsService } from './actions.service';
import { AccessDeniedException } from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const baseUser: Omit<SessionUser, 'id' | 'roles'> = {
  email: 'u@example.com',
  displayName: 'U',
  username: 'u',
  language: 'EN',
  gender: null,
  dob: null,
  avatarUrl: null,
  emailVerifiedAt: new Date(),
  accountSetupCompletedAt: new Date(),
  onboardingCompletedAt: new Date(),
};

const VA: SessionUser = { ...baseUser, id: 'va-1', roles: [Role.VRATARTHI] };
const VM: SessionUser = { ...baseUser, id: 'vm-1', roles: [Role.VRATMITRA] };

function makeRepo(overrides: Partial<Record<string, any>> = {}) {
  return {
    findOwnedJourneys: vi.fn().mockResolvedValue([]),
    findErcItemsByStatus: vi.fn().mockResolvedValue([]),
    findActiveSidenotes: vi.fn().mockResolvedValue([]),
    findJourneysPendingCompletion: vi.fn().mockResolvedValue([]),
    findJourneysWithNewErc: vi.fn().mockResolvedValue([]),
    findCustomErcReviews: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as any;
}

function makeVmService(scope: { journeyId: string; vratarthiId: string }[] = [], hasAssignments?: boolean) {
  return {
    getVmAssignedJourneys: vi.fn().mockResolvedValue(scope),
    hasAnyVmAssignment: vi.fn().mockResolvedValue(hasAssignments ?? scope.length > 0),
  } as any;
}

describe('ActionsService', () => {
  describe('getVaActions', () => {
    it('rejects a non-VA caller', async () => {
      const service = new ActionsService(makeRepo(), makeVmService());
      await expect(service.getVaActions(VM)).rejects.toBeInstanceOf(AccessDeniedException);
    });

    it('places items in the correct sections and counts them', async () => {
      const repo = makeRepo({
        findOwnedJourneys: vi
          .fn()
          .mockResolvedValue([{ id: 'j1', title: 'J1', state: JourneyState.ACTIVE }]),
        findErcItemsByStatus: vi
          .fn()
          .mockImplementation((_ids: string[], statuses: ErcStatus[]) =>
            Promise.resolve(
              statuses.includes(ErcStatus.REVISIT)
                ? [{ id: 'e1', ercType: 'exposure', status: ErcStatus.REVISIT }]
                : [{ id: 'e2', ercType: 'resolution', status: ErcStatus.SUBMITTED }],
            ),
          ),
        findActiveSidenotes: vi.fn().mockResolvedValue([{ id: 's1', vmId: 'vm-1' }]),
      });
      const service = new ActionsService(repo, makeVmService());

      const result = await service.getVaActions(VA);

      expect(result.ercRevisit).toHaveLength(1);
      expect(result.pendingVmApprovals).toHaveLength(1);
      expect(result.suggestionsAwaitingDecision).toHaveLength(1);
      expect(result.counts['ercRevisit']).toBe(1);
      expect(result.counts.total).toBe(3);
    });

    it('returns empty sections when the VA has nothing pending', async () => {
      const service = new ActionsService(makeRepo(), makeVmService());
      const result = await service.getVaActions(VA);
      expect(result.counts.total).toBe(0);
      expect(result.ercRevisit).toEqual([]);
    });
  });

  describe('getVmActions (scoping)', () => {
    it('aggregates over the VM-assigned journeys only', async () => {
      const repo = makeRepo({
        findErcItemsByStatus: vi.fn().mockResolvedValue([{ id: 'e1', status: ErcStatus.SUBMITTED }]),
      });
      const vmService = makeVmService([{ journeyId: 'j-assigned', vratarthiId: 'va-x' }]);
      const service = new ActionsService(repo, vmService);

      const result = await service.getVmActions(VM);

      expect(vmService.getVmAssignedJourneys).toHaveBeenCalledWith(VM.id);
      expect(repo.findErcItemsByStatus).toHaveBeenCalledWith(['j-assigned'], [ErcStatus.SUBMITTED]);
      expect(result.closureRequests).toHaveLength(1);
    });

    it('returns an empty queue for a user with no VM assignments', async () => {
      const repo = makeRepo();
      const service = new ActionsService(repo, makeVmService([], false));

      const result = await service.getVmActions(VM);

      expect(result.counts.total).toBe(0);
      expect(result.hasAssignments).toBe(false);
      // No scope → repository called with an empty journey-id list (no fan-out).
      expect(repo.findErcItemsByStatus).toHaveBeenCalledWith([], [ErcStatus.SUBMITTED]);
    });

    it('SCOPING: a global-only VM (no journey assignment) gets an empty actionable queue but nav-visible', async () => {
      // Global VM is view-only (spec/22): hasAssignments true (nav shows) but the
      // approval queue is empty because no journey is assigned to them.
      const repo = makeRepo({
        findErcItemsByStatus: vi.fn().mockResolvedValue([]),
      });
      const vmService = makeVmService([], true); // assigned journeys: none; hasAssignment: true
      const service = new ActionsService(repo, vmService);

      const result = await service.getVmActions(VM);

      expect(result.hasAssignments).toBe(true);
      expect(result.counts.total).toBe(0);
      expect(repo.findErcItemsByStatus).toHaveBeenCalledWith([], [ErcStatus.SUBMITTED]);
    });

    it('only surfaces the calling VM\'s own suggestions as status updates', async () => {
      const repo = makeRepo({
        findActiveSidenotes: vi.fn().mockResolvedValue([
          { id: 's-mine', vmId: 'vm-1' },
          { id: 's-other', vmId: 'vm-2' },
        ]),
      });
      const service = new ActionsService(repo, makeVmService([{ journeyId: 'j1', vratarthiId: 'va-x' }]));

      const result = await service.getVmActions(VM);

      expect(result.suggestionStatusUpdates).toHaveLength(1);
      expect(result.suggestionStatusUpdates[0].id).toBe('s-mine');
    });
  });
});
