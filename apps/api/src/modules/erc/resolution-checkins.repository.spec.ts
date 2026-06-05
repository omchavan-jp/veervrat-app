import { describe, it, expect, vi } from 'vitest';
import { CheckinStatus } from '@prisma/client';
import { ResolutionCheckinsRepository } from './resolution-checkins.repository';

const RESOLUTION_ID = 'r-1';

function makeCheckin(status: CheckinStatus, offset = 0) {
  const checkedInAt = new Date(Date.now() + offset * 1000);
  return {
    id: `c-${offset}`,
    journeyResolutionId: RESOLUTION_ID,
    status,
    note: null,
    checkedInAt,
    createdAt: checkedInAt,
  };
}

function makePrisma(checkins: ReturnType<typeof makeCheckin>[]) {
  return {
    resolutionCheckin: {
      findMany: vi.fn().mockResolvedValue(checkins),
      create: vi.fn(),
    },
    journeyResolution: {
      findUnique: vi.fn(),
    },
  };
}

function makeRepo(prisma: ReturnType<typeof makePrisma>) {
  const repo = Object.create(ResolutionCheckinsRepository.prototype) as ResolutionCheckinsRepository;
  (repo as unknown as Record<string, unknown>)['prisma'] = prisma;
  return repo;
}

describe('ResolutionCheckinsRepository — listWithStreak', () => {
  it('returns streak 0 for empty list', async () => {
    const repo = makeRepo(makePrisma([]));
    const result = await repo.listWithStreak(RESOLUTION_ID);
    expect(result.checkins).toHaveLength(0);
    expect(result.streak).toBe(0);
  });

  it('returns correct streak for all done', async () => {
    const checkins = [
      makeCheckin(CheckinStatus.DONE, 1),
      makeCheckin(CheckinStatus.DONE, 2),
      makeCheckin(CheckinStatus.DONE, 3),
    ];
    const repo = makeRepo(makePrisma(checkins));
    const result = await repo.listWithStreak(RESOLUTION_ID);
    expect(result.streak).toBe(3);
  });

  it('resets streak on missed entry', async () => {
    // done, done, missed, done, done → streak = 2 (trailing done run)
    const checkins = [
      makeCheckin(CheckinStatus.DONE, 1),
      makeCheckin(CheckinStatus.DONE, 2),
      makeCheckin(CheckinStatus.MISSED, 3),
      makeCheckin(CheckinStatus.DONE, 4),
      makeCheckin(CheckinStatus.DONE, 5),
    ];
    const repo = makeRepo(makePrisma(checkins));
    const result = await repo.listWithStreak(RESOLUTION_ID);
    expect(result.streak).toBe(2);
  });

  it('resets streak on partial entry', async () => {
    // done, partial, done → streak = 1
    const checkins = [
      makeCheckin(CheckinStatus.DONE, 1),
      makeCheckin(CheckinStatus.PARTIAL, 2),
      makeCheckin(CheckinStatus.DONE, 3),
    ];
    const repo = makeRepo(makePrisma(checkins));
    const result = await repo.listWithStreak(RESOLUTION_ID);
    expect(result.streak).toBe(1);
  });

  it('returns 0 when last entry is partial', async () => {
    const checkins = [
      makeCheckin(CheckinStatus.DONE, 1),
      makeCheckin(CheckinStatus.DONE, 2),
      makeCheckin(CheckinStatus.PARTIAL, 3),
    ];
    const repo = makeRepo(makePrisma(checkins));
    const result = await repo.listWithStreak(RESOLUTION_ID);
    expect(result.streak).toBe(0);
  });

  it('returns 0 when last entry is missed', async () => {
    const checkins = [
      makeCheckin(CheckinStatus.DONE, 1),
      makeCheckin(CheckinStatus.MISSED, 2),
    ];
    const repo = makeRepo(makePrisma(checkins));
    const result = await repo.listWithStreak(RESOLUTION_ID);
    expect(result.streak).toBe(0);
  });

  it('streak of 1 for a single done entry', async () => {
    const repo = makeRepo(makePrisma([makeCheckin(CheckinStatus.DONE, 1)]));
    const result = await repo.listWithStreak(RESOLUTION_ID);
    expect(result.streak).toBe(1);
  });

  it('returns all checkins in the result', async () => {
    const checkins = [
      makeCheckin(CheckinStatus.DONE, 1),
      makeCheckin(CheckinStatus.PARTIAL, 2),
    ];
    const repo = makeRepo(makePrisma(checkins));
    const result = await repo.listWithStreak(RESOLUTION_ID);
    expect(result.checkins).toHaveLength(2);
  });
});
