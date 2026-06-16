import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';

function makeRedis(overrides: Partial<{
  hget: () => Promise<string | null>;
  hincrby: () => Promise<number>;
  expire: () => Promise<number>;
  hset: () => Promise<number>;
  del: () => Promise<number>;
}> = {}) {
  return {
    hget: vi.fn().mockResolvedValue(null),
    hincrby: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    hset: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
}

function makeService(redis: ReturnType<typeof makeRedis>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  (service as unknown as Record<string, unknown>)['redis'] = redis;
  (service as unknown as Record<string, unknown>)['logger'] = { warn: vi.fn(), log: vi.fn() };
  (service as unknown as Record<string, unknown>)['auditService'] = { record: vi.fn() };
  return service;
}

describe('AuthService — checkLockout', () => {
  it('returns not locked when no Redis key', async () => {
    const redis = makeRedis({ hget: vi.fn().mockResolvedValue(null) });
    const service = makeService(redis);
    const result = await service.checkLockout('user@example.com');
    expect(result).toEqual({ locked: false, secondsRemaining: 0 });
  });

  it('returns locked when locked_until is in the future', async () => {
    const futureMs = (Date.now() + 600_000).toString();
    const redis = makeRedis({ hget: vi.fn().mockResolvedValue(futureMs) });
    const service = makeService(redis);
    const result = await service.checkLockout('user@example.com');
    expect(result.locked).toBe(true);
    expect(result.secondsRemaining).toBeGreaterThan(0);
  });

  it('returns not locked when locked_until is in the past', async () => {
    const pastMs = (Date.now() - 1000).toString();
    const redis = makeRedis({ hget: vi.fn().mockResolvedValue(pastMs) });
    const service = makeService(redis);
    const result = await service.checkLockout('user@example.com');
    expect(result).toEqual({ locked: false, secondsRemaining: 0 });
  });

  it('fails open (not locked) when Redis throws', async () => {
    const redis = makeRedis({ hget: vi.fn().mockRejectedValue(new Error('connection refused')) });
    const service = makeService(redis);
    const result = await service.checkLockout('user@example.com');
    expect(result).toEqual({ locked: false, secondsRemaining: 0 });
  });
});

describe('AuthService — recordFailedLogin', () => {
  it('increments Redis counter and sets expiry', async () => {
    const redis = makeRedis({ hincrby: vi.fn().mockResolvedValue(3) });
    const service = makeService(redis);
    await service.recordFailedLogin('user@example.com');
    expect(redis.hincrby).toHaveBeenCalledWith('lockout:user@example.com', 'failures', 1);
    expect(redis.expire).toHaveBeenCalledWith('lockout:user@example.com', 3600);
  });

  it('sets locked_until when failures reach 10', async () => {
    const redis = makeRedis({ hincrby: vi.fn().mockResolvedValue(10) });
    const service = makeService(redis);
    await service.recordFailedLogin('user@example.com');
    expect(redis.hset).toHaveBeenCalledWith(
      'lockout:user@example.com',
      'locked_until',
      expect.any(String),
    );
    expect(redis.expire).toHaveBeenCalledWith('lockout:user@example.com', 900);
  });

  it('does not set locked_until when failures are below 10', async () => {
    const redis = makeRedis({ hincrby: vi.fn().mockResolvedValue(5) });
    const service = makeService(redis);
    await service.recordFailedLogin('user@example.com');
    expect(redis.hset).not.toHaveBeenCalled();
  });

  it('does not throw when Redis errors', async () => {
    const redis = makeRedis({ hincrby: vi.fn().mockRejectedValue(new Error('timeout')) });
    const service = makeService(redis);
    await expect(service.recordFailedLogin('user@example.com')).resolves.not.toThrow();
  });
});

describe('AuthService — clearLockout', () => {
  it('deletes the Redis key', async () => {
    const redis = makeRedis();
    const service = makeService(redis);
    await service.clearLockout('user@example.com');
    expect(redis.del).toHaveBeenCalledWith('lockout:user@example.com');
  });

  it('does not throw when Redis errors', async () => {
    const redis = makeRedis({ del: vi.fn().mockRejectedValue(new Error('timeout')) });
    const service = makeService(redis);
    await expect(service.clearLockout('user@example.com')).resolves.not.toThrow();
  });
});
