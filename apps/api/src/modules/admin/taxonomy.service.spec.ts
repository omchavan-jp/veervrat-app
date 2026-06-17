import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { TaxonomyService } from './taxonomy.service';
import {
  AccessDeniedException,
  EntityInUseException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const base: Omit<SessionUser, 'id' | 'roles'> = {
  email: 'u@x.com', displayName: 'U', username: 'u', language: 'EN', gender: null, dob: null,
  avatarUrl: null, emailVerifiedAt: new Date(), accountSetupCompletedAt: new Date(), onboardingCompletedAt: new Date(),
};
const ADMIN: SessionUser = { ...base, id: 'admin-1', roles: [Role.ADMIN] };
const MOD: SessionUser = { ...base, id: 'mod-1', roles: [Role.MODERATOR] };
const VA: SessionUser = { ...base, id: 'va-1', roles: [Role.VRATARTHI] };

function make(overrides: Record<string, any> = {}) {
  const repo = {
    createVirtue: vi.fn().mockResolvedValue({ id: 'v1' }),
    findVirtue: vi.fn().mockResolvedValue({ id: 'v1', _count: { subvirtues: 0 } }),
    deleteVirtue: vi.fn().mockResolvedValue({ id: 'v1' }),
    findSubvirtue: vi.fn().mockResolvedValue({ id: 's1', _count: { sentences: 0, weaknesses: 0 } }),
    deleteSubvirtue: vi.fn().mockResolvedValue({ id: 's1' }),
    findWeakness: vi.fn().mockResolvedValue({
      id: 'w1',
      _count: { journeyWeaknesses: 0, exposureWeaknesses: 0, resolutionWeaknesses: 0, challengeWeaknesses: 0, testAttempts: 0 },
    }),
    deleteWeakness: vi.fn().mockResolvedValue({ id: 'w1' }),
    upsertWeaknessSubvirtue: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as any;
  return { service: new TaxonomyService(repo), repo };
}

describe('TaxonomyService', () => {
  it('NEGATIVE: moderator cannot create a virtue', async () => {
    const { service } = make();
    await expect(service.createVirtue(MOD, { nameEn: 'Courage' })).rejects.toBeInstanceOf(AccessDeniedException);
  });

  it('NEGATIVE: vratarthi cannot create a virtue', async () => {
    const { service } = make();
    await expect(service.createVirtue(VA, { nameEn: 'Courage' })).rejects.toBeInstanceOf(AccessDeniedException);
  });

  it('admin creates a virtue', async () => {
    const { service, repo } = make();
    await service.createVirtue(ADMIN, { nameEn: 'Courage' });
    expect(repo.createVirtue).toHaveBeenCalled();
  });

  it('delete virtue blocked when it has subvirtues', async () => {
    const { service } = make({ findVirtue: vi.fn().mockResolvedValue({ id: 'v1', _count: { subvirtues: 2 } }) });
    await expect(service.deleteVirtue(ADMIN, 'v1')).rejects.toBeInstanceOf(EntityInUseException);
  });

  it('delete virtue 404 when missing', async () => {
    const { service } = make({ findVirtue: vi.fn().mockResolvedValue(null) });
    await expect(service.deleteVirtue(ADMIN, 'v1')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('delete subvirtue blocked when linked to weaknesses', async () => {
    const { service } = make({ findSubvirtue: vi.fn().mockResolvedValue({ id: 's1', _count: { sentences: 0, weaknesses: 1 } }) });
    await expect(service.deleteSubvirtue(ADMIN, 's1')).rejects.toBeInstanceOf(EntityInUseException);
  });

  it('delete weakness blocked when referenced by a journey', async () => {
    const { service } = make({
      findWeakness: vi.fn().mockResolvedValue({
        id: 'w1',
        _count: { journeyWeaknesses: 1, exposureWeaknesses: 0, resolutionWeaknesses: 0, challengeWeaknesses: 0, testAttempts: 0 },
      }),
    });
    await expect(service.deleteWeakness(ADMIN, 'w1')).rejects.toBeInstanceOf(EntityInUseException);
  });

  it('admin links weakness to subvirtue with default priority', async () => {
    const { service, repo } = make();
    await service.linkWeaknessSubvirtue(ADMIN, { weaknessId: 'w1', subvirtueId: 's1' });
    expect(repo.upsertWeaknessSubvirtue).toHaveBeenCalledWith('w1', 's1', 0);
  });
});
