import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { VmRelationshipsService } from './vm-relationships.service';
import { VmRelationshipsRepository } from './vm-relationships.repository';
import { JourneysRepository } from '../journeys/journeys.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import type { SessionUser } from '../auth/types/auth.types';
import { Role, VmRelationshipState } from '@prisma/client';

describe('VmRelationshipsService', () => {
  let service: VmRelationshipsService;
  let repository: VmRelationshipsRepository;

  const mockRepository = {
    findActiveGlobalVm: vi.fn(),
    findActiveJourneyAssignmentsForVm: vi.fn(),
    endGlobalVm: vi.fn(),
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
      ],
    }).compile();

    service = module.get<VmRelationshipsService>(VmRelationshipsService);
    repository = module.get<VmRelationshipsRepository>(VmRelationshipsRepository);
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
  });
});
