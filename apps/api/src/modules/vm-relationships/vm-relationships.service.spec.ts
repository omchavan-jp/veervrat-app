import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { VmRelationshipsService } from './vm-relationships.service';
import { VmRelationshipsRepository } from './vm-relationships.repository';
import { JourneysRepository } from '../journeys/journeys.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { NotificationsService } from '../notifications/notifications.service';
import type { SessionUser } from '../auth/types/auth.types';
import { NotificationEventType, Role } from '@prisma/client';

describe('VmRelationshipsService', () => {
  let service: VmRelationshipsService;

  const mockRepository = {
    findActiveGlobalVm: vi.fn(),
    findActiveJourneyAssignmentsForVm: vi.fn(),
    endGlobalVm: vi.fn(),
    endJourneyAssignmentsForVm: vi.fn(),
    findActiveJourneyAssignment: vi.fn(),
    endJourneyAssignment: vi.fn(),
    createGlobalRelationship: vi.fn(),
    createJourneyAssignment: vi.fn(),
    getMyVms: vi.fn(),
  };

  const mockJourneysRepository = {
    findById: vi.fn(),
  };

  const mockNotificationsRepository = {
    create: vi.fn(),
  };

  const mockNotificationsService = {
    create: vi.fn(),
  };

  const mockVaUser: SessionUser = {
    id: 'va-1',
    email: 'va@test.com',
    username: 'va_user',
    displayName: 'VA User',
    roles: [Role.VRATARTHI],
    avatarUrl: null,
    language: 'EN',
  } as SessionUser;

  const mockVmUser: SessionUser = {
    id: 'vm-1',
    email: 'vm@test.com',
    username: 'vm_user',
    displayName: 'VM User',
    roles: [Role.VRATMITRA],
    avatarUrl: null,
    language: 'EN',
  } as SessionUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmRelationshipsService,
        { provide: VmRelationshipsRepository, useValue: mockRepository },
        { provide: JourneysRepository, useValue: mockJourneysRepository },
        { provide: NotificationsRepository, useValue: mockNotificationsRepository },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<VmRelationshipsService>(VmRelationshipsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyVms', () => {
    it('should return list of VMs for VA', async () => {
      const mockVms = [
        {
          id: 'vm-1',
          displayName: 'VM One',
          username: 'vm_one',
          avatarUrl: null,
          scope: 'GLOBAL',
          assignedJourneys: [],
        },
      ];

      mockRepository.getMyVms.mockResolvedValue(mockVms);

      const result = await service.getMyVms(mockVaUser);

      expect(result).toEqual(mockVms);
      expect(mockRepository.getMyVms).toHaveBeenCalledWith(mockVaUser.id, undefined);
    });

    it('should reject access for non-VA users', async () => {
      await expect(service.getMyVms(mockVmUser)).rejects.toThrow(ForbiddenException);
    });

    it('should filter by scope when provided', async () => {
      const mockVms: unknown[] = [];
      mockRepository.getMyVms.mockResolvedValue(mockVms);

      await service.getMyVms(mockVaUser, 'GLOBAL');

      expect(mockRepository.getMyVms).toHaveBeenCalledWith(mockVaUser.id, 'GLOBAL');
    });

    // A vratarthi who has invited nobody is an ordinary state, not an error — most accounts are
    // in it on the day they sign up. It has to come back as an empty list so the screen can show
    // its empty state, rather than as a refusal, which the client would render as a failure.
    it('returns an empty list for a vratarthi with no vratmitras, rather than refusing', async () => {
      mockRepository.getMyVms.mockResolvedValue([]);

      const result = await service.getMyVms(mockVaUser);

      expect(result).toEqual([]);
      expect(mockRepository.getMyVms).toHaveBeenCalledWith(mockVaUser.id, undefined);
    });
  });

  describe('removeGlobalVm', () => {
    const activeGlobal = { id: 'rel-1', vmId: 'vm-9', vratarthiId: 'va-1' };

    beforeEach(() => {
      mockRepository.findActiveGlobalVm.mockResolvedValue(activeGlobal);
      mockRepository.findActiveJourneyAssignmentsForVm.mockResolvedValue([
        { journeyId: 'j-1', journeyTitle: 'Journey 1' },
      ]);
      mockRepository.endGlobalVm.mockResolvedValue({ ...activeGlobal, endedAt: new Date() });
      mockRepository.endJourneyAssignmentsForVm.mockResolvedValue(1);
    });

    it('keep (default): ends only the global relationship, not journey assignments', async () => {
      const result = await service.removeGlobalVm(mockVaUser);
      expect(mockRepository.endGlobalVm).toHaveBeenCalledWith('rel-1');
      expect(mockRepository.endJourneyAssignmentsForVm).not.toHaveBeenCalled();
      expect(result).toEqual({
        removedVmId: 'vm-9',
        affectedJourneys: [{ journeyId: 'j-1', journeyTitle: 'Journey 1' }],
        cascade: 'keep',
      });
    });

    it('unassign: also ends the outgoing VM journey assignments', async () => {
      const result = await service.removeGlobalVm(mockVaUser, 'unassign');
      expect(mockRepository.endGlobalVm).toHaveBeenCalledWith('rel-1');
      expect(mockRepository.endJourneyAssignmentsForVm).toHaveBeenCalledWith('vm-9', 'va-1');
      expect(result.cascade).toBe('unassign');
    });

    it('notifies the outgoing VM with VM_WITHDREW', async () => {
      await service.removeGlobalVm(mockVaUser, 'keep');
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        'vm-9',
        'va-1',
        NotificationEventType.VM_WITHDREW,
        'user',
        'va-1',
      );
    });

    it('404s when there is no active global VM', async () => {
      mockRepository.findActiveGlobalVm.mockResolvedValue(null);
      await expect(service.removeGlobalVm(mockVaUser)).rejects.toThrow();
      expect(mockRepository.endGlobalVm).not.toHaveBeenCalled();
    });

    it('rejects a non-VA caller (403)', async () => {
      await expect(service.removeGlobalVm(mockVmUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
