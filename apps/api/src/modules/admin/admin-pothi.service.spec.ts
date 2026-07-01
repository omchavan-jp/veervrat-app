import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { AdminPothiService } from './admin-pothi.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const base: Omit<SessionUser, 'id' | 'roles'> = {
  email: 'u@x.com',
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
const ADMIN: SessionUser = { ...base, id: 'admin-1', roles: [Role.ADMIN] };
const VA: SessionUser = { ...base, id: 'va-1', roles: [Role.VRATARTHI] };

function make(overrides: Record<string, any> = {}) {
  const repo = {
    createPothiSection: vi.fn().mockResolvedValue({ id: 'p1' }),
    updatePothiSection: vi.fn().mockResolvedValue({ id: 'p1' }),
    findPothiSection: vi.fn().mockResolvedValue({ id: 'p1' }),
    deletePothiSection: vi.fn().mockResolvedValue({ id: 'p1' }),
    countShlokasByIds: vi.fn().mockResolvedValue(2),
    ...overrides,
  } as any;
  return { service: new AdminPothiService(repo), repo };
}

describe('AdminPothiService', () => {
  it('NEGATIVE: non-admin cannot create a section', async () => {
    const { service } = make();
    await expect(service.create(VA, { sectionNumber: 1, titleEn: 'A' })).rejects.toBeInstanceOf(
      AccessDeniedException,
    );
  });

  it('create with valid ordered shlokas', async () => {
    const { service, repo } = make();
    await service.create(ADMIN, { sectionNumber: 1, titleEn: 'A', shlokaIds: ['a', 'b'] });
    expect(repo.createPothiSection).toHaveBeenCalledWith(
      expect.objectContaining({ titleEn: 'A' }),
      ['a', 'b'],
    );
  });

  it('create rejects unknown shlokas', async () => {
    const { service } = make({ countShlokasByIds: vi.fn().mockResolvedValue(1) });
    await expect(
      service.create(ADMIN, { sectionNumber: 1, titleEn: 'A', shlokaIds: ['a', 'b'] }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('update 404 when section missing', async () => {
    const { service } = make({ findPothiSection: vi.fn().mockResolvedValue(null) });
    await expect(service.update(ADMIN, 'p1', { titleEn: 'B' })).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
