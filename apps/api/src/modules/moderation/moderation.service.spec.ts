import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ErcEntityType, Role } from '@prisma/client';
import { ModerationService } from './moderation.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
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
const MOD: SessionUser = { ...base, id: 'mod-1', roles: [Role.MODERATOR] };
const VA: SessionUser = { ...base, id: 'va-1', roles: [Role.VRATARTHI] };

const pendingReview = {
  id: 'r1',
  entityType: ErcEntityType.EXPOSURE,
  status: 'pending',
  submittedById: 'submitter-1',
  journeyExposureId: 'je1',
  journeyResolutionId: null,
  journeyChallengeId: null,
};

function make(repoOverrides: Record<string, any> = {}, ercOverrides: Record<string, any> = {}) {
  const repo = {
    listPending: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    findReviewDetail: vi
      .fn()
      .mockResolvedValue({ id: 'r1', ercType: 'exposure', item: {}, journey: {}, submitter: {} }),
    findReviewById: vi.fn().mockResolvedValue(pendingReview),
    approveAndPromote: vi.fn().mockResolvedValue({ poolId: 'pool-1' }),
    setRejected: vi.fn().mockResolvedValue({ id: 'r1' }),
    reviewItemId: (r: any) => r.journeyExposureId ?? r.journeyResolutionId ?? r.journeyChallengeId,
    ...repoOverrides,
  } as any;
  const erc = {
    findById: vi.fn().mockResolvedValue({ id: 'je1', journeyId: 'j1' }),
    updateCustomItem: vi.fn().mockResolvedValue({}),
    setReviewStatus: vi.fn().mockResolvedValue({}),
    ...ercOverrides,
  } as any;
  const notifications = { create: vi.fn().mockResolvedValue(undefined) } as any;
  return { service: new ModerationService(repo, erc, notifications), repo, erc, notifications };
}

describe('ModerationService', () => {
  it('NEGATIVE: non-moderator cannot access the queue', async () => {
    const { service } = make();
    await expect(service.getQueue(VA)).rejects.toBeInstanceOf(AccessDeniedException);
  });

  it('moderator gets the queue', async () => {
    const { service, repo } = make();
    await service.getQueue(MOD);
    expect(repo.listPending).toHaveBeenCalled();
  });

  it('approve promotes to pool, sets status, notifies submitter', async () => {
    const { service, repo, erc, notifications } = make();
    const res = await service.approve(MOD, 'r1', {});
    expect(repo.approveAndPromote).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewId: 'r1',
        ercType: 'exposure',
        itemId: 'je1',
        journeyId: 'j1',
      }),
    );
    expect(erc.setReviewStatus).toHaveBeenCalledWith('je1', 'approved', 'exposure');
    expect(notifications.create).toHaveBeenCalledWith(
      'submitter-1',
      'mod-1',
      'CUSTOM_ERC_APPROVED',
      'exposure',
      'je1',
    );
    expect(res.poolId).toBe('pool-1');
  });

  it('approve with edits applies them before promotion', async () => {
    const { service, erc } = make();
    await service.approve(MOD, 'r1', { edits: { titleEn: 'Edited' } });
    expect(erc.updateCustomItem).toHaveBeenCalledWith('je1', { titleEn: 'Edited' }, 'exposure');
  });

  it('NEGATIVE: approving an already-decided review is rejected', async () => {
    const { service } = make({
      findReviewById: vi.fn().mockResolvedValue({ ...pendingReview, status: 'approved' }),
    });
    await expect(service.approve(MOD, 'r1', {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('reject requires a reason', async () => {
    const { service } = make();
    await expect(service.reject(MOD, 'r1', '   ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reject sets rejected, item status, notifies — not promoted', async () => {
    const { service, repo, erc, notifications } = make();
    await service.reject(MOD, 'r1', 'Not specific enough');
    expect(repo.setRejected).toHaveBeenCalledWith('r1', 'mod-1', 'Not specific enough');
    expect(repo.approveAndPromote).not.toHaveBeenCalled();
    expect(erc.setReviewStatus).toHaveBeenCalledWith('je1', 'rejected', 'exposure');
    expect(notifications.create).toHaveBeenCalledWith(
      'submitter-1',
      'mod-1',
      'CUSTOM_ERC_REJECTED',
      'exposure',
      'je1',
    );
  });

  it('NEGATIVE: unknown review → 404', async () => {
    const { service } = make({ findReviewById: vi.fn().mockResolvedValue(null) });
    await expect(service.approve(MOD, 'nope', {})).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
