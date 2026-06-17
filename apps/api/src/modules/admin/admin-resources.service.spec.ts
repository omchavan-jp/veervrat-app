import { describe, it, expect, vi } from 'vitest';
import { ResourceType, Role } from '@prisma/client';
import { AdminResourcesService } from './admin-resources.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const base: Omit<SessionUser, 'id' | 'roles'> = {
  email: 'u@x.com', displayName: 'U', username: 'u', language: 'EN', gender: null, dob: null,
  avatarUrl: null, emailVerifiedAt: new Date(), accountSetupCompletedAt: new Date(), onboardingCompletedAt: new Date(),
};
const ADMIN: SessionUser = { ...base, id: 'admin-1', roles: [Role.ADMIN] };
const MOD: SessionUser = { ...base, id: 'mod-1', roles: [Role.MODERATOR] };

const validDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] };

function make(overrides: Record<string, any> = {}) {
  const repo = {
    createResource: vi.fn().mockResolvedValue({ id: 'r1' }),
    updateResource: vi.fn().mockResolvedValue({ id: 'r1' }),
    findResource: vi.fn().mockResolvedValue({ id: 'r1' }),
    deleteResource: vi.fn().mockResolvedValue({ id: 'r1' }),
    ...overrides,
  } as any;
  return { service: new AdminResourcesService(repo), repo };
}

describe('AdminResourcesService', () => {
  it('NEGATIVE: non-admin cannot create a resource', async () => {
    const { service } = make();
    await expect(service.create(MOD, { type: ResourceType.LINK, title: 'X' })).rejects.toBeInstanceOf(AccessDeniedException);
  });

  it('admin creates a resource with sanitized description', async () => {
    const { service, repo } = make();
    await service.create(ADMIN, { type: ResourceType.LINK, title: 'X', description: validDoc });
    expect(repo.createResource).toHaveBeenCalled();
  });

  it('rejects invalid Tiptap description', async () => {
    const { service } = make();
    await expect(
      service.create(ADMIN, { type: ResourceType.LINK, title: 'X', description: { not: 'a doc' } }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('update 404 when resource missing', async () => {
    const { service } = make({ findResource: vi.fn().mockResolvedValue(null) });
    await expect(service.update(ADMIN, 'r1', { title: 'Y' })).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
