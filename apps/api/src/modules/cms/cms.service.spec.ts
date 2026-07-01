import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { CmsService } from './cms.service';
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
const MOD: SessionUser = { ...base, id: 'mod-1', roles: [Role.MODERATOR] };

const validDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
};

function make(overrides: Record<string, any> = {}) {
  const repo = {
    findByKey: vi.fn().mockResolvedValue({ id: 'c1', key: 'why-shlokas' }),
    list: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({ id: 'c1' }),
    update: vi.fn().mockResolvedValue({ id: 'c1' }),
    delete: vi.fn().mockResolvedValue({ id: 'c1' }),
    ...overrides,
  } as any;
  return { service: new CmsService(repo), repo };
}

describe('CmsService', () => {
  it('public read returns the page', async () => {
    const { service, repo } = make();
    await service.getByKey('why-shlokas');
    expect(repo.findByKey).toHaveBeenCalledWith('why-shlokas');
  });

  it('public read 404 when key unknown', async () => {
    const { service } = make({ findByKey: vi.fn().mockResolvedValue(null) });
    await expect(service.getByKey('nope')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('NEGATIVE: moderator cannot upsert', async () => {
    const { service } = make();
    await expect(
      service.upsert(MOD, { key: 'why-shlokas', titleEn: 'X', bodyEn: validDoc }),
    ).rejects.toBeInstanceOf(AccessDeniedException);
  });

  it('admin upserts with sanitized body', async () => {
    const { service, repo } = make();
    await service.upsert(ADMIN, { key: 'why-shlokas', titleEn: 'X', bodyEn: validDoc });
    expect(repo.upsert).toHaveBeenCalled();
  });

  it('rejects invalid Tiptap body', async () => {
    const { service } = make();
    await expect(
      service.upsert(ADMIN, { key: 'why-shlokas', titleEn: 'X', bodyEn: { bad: true } }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
