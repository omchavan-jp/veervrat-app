import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { DashboardController } from './dashboard.controller';
import { AccessDeniedException } from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const VA_USER: SessionUser = {
  id: 'va-1',
  email: 'va@test.com',
  displayName: 'VA User',
  username: 'va_user',
  roles: [Role.VRATARTHI],
  language: 'EN',
  gender: null,
  dob: null,
  emailVerifiedAt: new Date(),
  onboardingCompletedAt: new Date(),
};

const VM_ONLY_USER: SessionUser = {
  id: 'vm-1',
  email: 'vm@test.com',
  displayName: 'VM User',
  username: 'vm_user',
  roles: [Role.VRATMITRA],
  language: 'EN',
  gender: null,
  dob: null,
  emailVerifiedAt: new Date(),
  onboardingCompletedAt: new Date(),
};

function makeService() {
  return {
    getStats: vi.fn().mockResolvedValue({ virtues: { count: 0 } }),
    getSuggestions: vi.fn().mockResolvedValue({ suggestions: [] }),
    getPlatformStats: vi.fn().mockResolvedValue({ vratarthis: 0, vratmitras: 0, testsSolved: 0, practiceDaysCompleted: 0 }),
  };
}

function makeController(svc = makeService()) {
  return { ctrl: new DashboardController(svc as never), svc };
}

describe('DashboardController — auth matrix', () => {
  describe('GET /dashboard/stats', () => {
    it('positive: authenticated VA gets stats', async () => {
      const { ctrl, svc } = makeController();
      await ctrl.getStats(VA_USER);
      expect(svc.getStats).toHaveBeenCalledWith(VA_USER.id);
    });

    it('negative: VM-only role is rejected with 403', async () => {
      const { ctrl } = makeController();
      await expect(ctrl.getStats(VM_ONLY_USER)).rejects.toThrow(AccessDeniedException);
    });
  });

  describe('GET /dashboard/suggestions', () => {
    it('positive: authenticated VA gets suggestions', async () => {
      const { ctrl, svc } = makeController();
      await ctrl.getSuggestions(VA_USER);
      expect(svc.getSuggestions).toHaveBeenCalledWith(VA_USER.id);
    });

    it('negative: VM-only role is rejected with 403', async () => {
      const { ctrl } = makeController();
      await expect(ctrl.getSuggestions(VM_ONLY_USER)).rejects.toThrow(AccessDeniedException);
    });
  });

  describe('GET /dashboard/platform-stats', () => {
    it('positive: any authenticated user gets platform stats', async () => {
      const { ctrl, svc } = makeController();
      await ctrl.getPlatformStats();
      expect(svc.getPlatformStats).toHaveBeenCalledOnce();
    });
  });
});
