import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { VirtuesService } from './virtues.service';
import { EntityNotFoundException } from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const VA: SessionUser = {
  id: 'va-1', email: 'v@x.com', displayName: 'V', username: 'v', language: 'EN',
  gender: null, dob: null, avatarUrl: null, emailVerifiedAt: new Date(),
  accountSetupCompletedAt: new Date(), onboardingCompletedAt: new Date(), roles: [Role.VRATARTHI],
};

function make(repo: Record<string, any>, journeys: Record<string, any> = {}) {
  return new VirtuesService(
    repo as never,
    { hasActiveJourneyForSentence: vi.fn().mockResolvedValue(false), ...journeys } as never,
  );
}

describe('VirtuesService', () => {
  it('lists virtues', async () => {
    const repo = { listVirtues: vi.fn().mockResolvedValue([{ id: 'v1', subvirtueCount: 3 }]) };
    expect(await make(repo).getVirtues()).toHaveLength(1);
  });

  it('returns a virtue detail', async () => {
    const repo = { findVirtueById: vi.fn().mockResolvedValue({ id: 'v1', subvirtues: [] }) };
    expect((await make(repo).getVirtue('v1')).id).toBe('v1');
  });

  it('NEGATIVE: unknown virtue → 404', async () => {
    const repo = { findVirtueById: vi.fn().mockResolvedValue(null) };
    await expect(make(repo).getVirtue('nope')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('subvirtue detail includes weaknesses + sentences', async () => {
    const repo = { findSubvirtueById: vi.fn().mockResolvedValue({ id: 's1', weaknesses: [{ id: 'w1' }], sentences: [{ id: 'se1' }] }) };
    const res = await make(repo).getSubvirtue('s1');
    expect(res.weaknesses).toHaveLength(1);
    expect(res.sentences).toHaveLength(1);
  });

  it('NEGATIVE: unknown subvirtue → 404', async () => {
    const repo = { findSubvirtueById: vi.fn().mockResolvedValue(null) };
    await expect(make(repo).getSubvirtue('nope')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('sentence info for a guest has no active-journey indicator', async () => {
    const repo = { findSentenceById: vi.fn().mockResolvedValue({ id: 'se1', textEn: 'x', subvirtue: {} }) };
    const res = await make(repo).getSentence(undefined, 'se1');
    expect(res.hasActiveJourney).toBe(false);
  });

  it('sentence info for an authed VA reflects the active-journey indicator', async () => {
    const repo = { findSentenceById: vi.fn().mockResolvedValue({ id: 'se1', textEn: 'x', subvirtue: {} }) };
    const svc = make(repo, { hasActiveJourneyForSentence: vi.fn().mockResolvedValue(true) });
    const res = await svc.getSentence(VA, 'se1');
    expect(res.hasActiveJourney).toBe(true);
  });

  it('NEGATIVE: unknown sentence → 404', async () => {
    const repo = { findSentenceById: vi.fn().mockResolvedValue(null) };
    await expect(make(repo).getSentence(VA, 'nope')).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
