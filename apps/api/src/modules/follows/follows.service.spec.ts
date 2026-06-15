import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FollowsService } from './follows.service';
import { EntityNotFoundException } from '../../common/exceptions/app.exceptions';
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

function make(repoOverrides: Record<string, any> = {}, target: any = { id: 'target-1', username: 'target' }) {
  const repo = {
    exists: vi.fn().mockResolvedValue(false),
    follow: vi.fn().mockResolvedValue(undefined),
    unfollow: vi.fn().mockResolvedValue(undefined),
    countFollowers: vi.fn().mockResolvedValue(0),
    countFollowing: vi.fn().mockResolvedValue(0),
    areMutualFollows: vi.fn().mockResolvedValue(false),
    ...repoOverrides,
  } as any;
  const users = { findByUsername: vi.fn().mockResolvedValue(target) } as any;
  const notifs = { create: vi.fn().mockResolvedValue({}) } as any;
  const service = new FollowsService(repo, users, notifs);
  return { service, repo, users, notifs };
}

describe('FollowsService', () => {
  it('follows a user and fires NEW_FOLLOWER on a new edge', async () => {
    const { service, repo, notifs } = make({ exists: vi.fn().mockResolvedValue(false) });
    await service.follow(VA, 'target');
    expect(repo.follow).toHaveBeenCalledWith('va-1', 'target-1');
    expect(notifs.create).toHaveBeenCalledWith('target-1', 'va-1', 'NEW_FOLLOWER', 'user', 'va-1');
  });

  it('idempotent re-follow does not re-notify', async () => {
    const { service, repo, notifs } = make({ exists: vi.fn().mockResolvedValue(true) });
    await service.follow(VA, 'target');
    expect(repo.follow).toHaveBeenCalled();
    expect(notifs.create).not.toHaveBeenCalled();
  });

  it('NEGATIVE: self-follow rejected', async () => {
    const { service, repo } = make({}, { id: 'va-1', username: 'u' });
    await expect(service.follow(VA, 'u')).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.follow).not.toHaveBeenCalled();
  });

  it('NEGATIVE: following a non-existent user 404s', async () => {
    const { service } = make({}, null);
    await expect(service.follow(VA, 'ghost')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('unfollow is idempotent', async () => {
    const { service, repo } = make();
    await service.unfollow(VA, 'target');
    expect(repo.unfollow).toHaveBeenCalledWith('va-1', 'target-1');
  });

  it('getStatus reports both directions', async () => {
    const exists = vi.fn()
      .mockResolvedValueOnce(true)   // viewer → target
      .mockResolvedValueOnce(false); // target → viewer
    const { service } = make({ exists });
    const status = await service.getStatus('va-1', 'target-1');
    expect(status).toEqual({ isFollowing: true, followsYou: false });
  });

  it('areMutualFollows delegates to the repository', async () => {
    const { service, repo } = make({ areMutualFollows: vi.fn().mockResolvedValue(true) });
    await expect(service.areMutualFollows('a', 'b')).resolves.toBe(true);
    expect(repo.areMutualFollows).toHaveBeenCalledWith('a', 'b');
  });
});
