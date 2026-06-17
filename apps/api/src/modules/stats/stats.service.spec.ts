import { describe, it, expect, vi } from 'vitest';
import { StatsService } from './stats.service';
import type { PlatformStats } from './stats.repository';

const PLATFORM_STATS: PlatformStats = {
  vratarthis: 42,
  vratmitras: 7,
  testsSolved: 130,
  practiceDaysCompleted: 800,
};

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    getPlatformStats: vi.fn().mockResolvedValue(PLATFORM_STATS),
    ...overrides,
  };
}

function makeRedis(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    ...overrides,
  };
}

function makeService(
  repo: ReturnType<typeof makeRepo> = makeRepo(),
  redis: ReturnType<typeof makeRedis> = makeRedis(),
) {
  const svc = new StatsService(repo as never, redis as never);
  return { svc, repo, redis };
}

describe('StatsService.getPlatformStats', () => {
  it('returns cached value on cache hit without calling DB', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(JSON.stringify(PLATFORM_STATS)) });
    const { svc, repo } = makeService(makeRepo(), redis);
    const result = await svc.getPlatformStats();
    expect(result).toEqual(PLATFORM_STATS);
    expect(repo.getPlatformStats).not.toHaveBeenCalled();
  });

  it('queries DB and writes to cache (60-min TTL) on cache miss', async () => {
    const { svc, repo, redis } = makeService();
    const result = await svc.getPlatformStats();
    expect(repo.getPlatformStats).toHaveBeenCalledOnce();
    expect(redis.set).toHaveBeenCalledWith('platform:stats', JSON.stringify(PLATFORM_STATS), 'EX', 3600);
    expect(result).toEqual(PLATFORM_STATS);
  });

  it('falls back to DB when Redis get throws', async () => {
    const redis = makeRedis({ get: vi.fn().mockRejectedValue(new Error('Redis down')) });
    const { svc, repo } = makeService(makeRepo(), redis);
    const result = await svc.getPlatformStats();
    expect(repo.getPlatformStats).toHaveBeenCalledOnce();
    expect(result).toEqual(PLATFORM_STATS);
  });

  it('still returns stats when Redis set throws (write failure does not break response)', async () => {
    const redis = makeRedis({ set: vi.fn().mockRejectedValue(new Error('Redis write down')) });
    const { svc } = makeService(makeRepo(), redis);
    const result = await svc.getPlatformStats();
    expect(result).toEqual(PLATFORM_STATS);
  });
});
