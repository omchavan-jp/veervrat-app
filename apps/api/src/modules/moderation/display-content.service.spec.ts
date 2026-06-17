import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { DisplayContentService } from './display-content.service';
import { AccessDeniedException, EntityNotFoundException } from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const base: Omit<SessionUser, 'id' | 'roles'> = {
  email: 'u@x.com', displayName: 'U', username: 'u', language: 'EN', gender: null, dob: null,
  avatarUrl: null, emailVerifiedAt: new Date(), accountSetupCompletedAt: new Date(), onboardingCompletedAt: new Date(),
};
const MOD: SessionUser = { ...base, id: 'mod-1', roles: [Role.MODERATOR] };
const ADMIN: SessionUser = { ...base, id: 'admin-1', roles: [Role.ADMIN] };
const VA: SessionUser = { ...base, id: 'va-1', roles: [Role.VRATARTHI] };

function make(overrides: Record<string, any> = {}) {
  const repo = {
    findBlog: vi.fn().mockResolvedValue({ id: 'b1' }),
    setBlogFeatured: vi.fn().mockResolvedValue({ id: 'b1', featured: true }),
    findExperienceLog: vi.fn().mockResolvedValue({ id: 'e1' }),
    setExperienceLogFeatured: vi.fn().mockResolvedValue({ id: 'e1', featured: true }),
    ...overrides,
  } as any;
  return { service: new DisplayContentService(repo), repo };
}

describe('DisplayContentService', () => {
  it('NEGATIVE: vratarthi cannot feature a blog', async () => {
    const { service } = make();
    await expect(service.setBlogFeatured(VA, 'b1', true)).rejects.toBeInstanceOf(AccessDeniedException);
  });

  it('moderator features a blog', async () => {
    const { service, repo } = make();
    await service.setBlogFeatured(MOD, 'b1', true);
    expect(repo.setBlogFeatured).toHaveBeenCalledWith('b1', true);
  });

  it('admin features an experience', async () => {
    const { service, repo } = make();
    await service.setExperienceFeatured(ADMIN, 'e1', true);
    expect(repo.setExperienceLogFeatured).toHaveBeenCalledWith('e1', true);
  });

  it('404 when blog missing', async () => {
    const { service } = make({ findBlog: vi.fn().mockResolvedValue(null) });
    await expect(service.setBlogFeatured(MOD, 'b1', true)).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
