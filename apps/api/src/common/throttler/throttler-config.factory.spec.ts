import { describe, it, expect, vi } from 'vitest';
import type Redis from 'ioredis';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { GLOBAL_THROTTLER, buildThrottlerOptions } from './throttler-config.factory';

const redis = {} as Redis;
const makeLogger = () => ({ warn: vi.fn() });

/** `ThrottlerModuleOptions` is a union with a bare array; the factory always returns the object form. */
const asRecord = (options: ThrottlerModuleOptions) =>
  options as Exclude<ThrottlerModuleOptions, unknown[]>;

describe('buildThrottlerOptions', () => {
  it('uses Redis storage when REDIS_URL is set', () => {
    const options = asRecord(buildThrottlerOptions(redis, makeLogger(), 'redis://localhost:6380'));

    // Without shared storage, counters are per-process: N replicas permit N× the limit and
    // every deploy resets them.
    expect(options.storage).toBeInstanceOf(ThrottlerStorageRedisService);
  });

  it('does not warn when Redis is configured', () => {
    const logger = makeLogger();
    buildThrottlerOptions(redis, logger, 'redis://localhost:6380');

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([undefined, ''])('falls back to in-memory storage when REDIS_URL is %o', (url) => {
    const options = asRecord(buildThrottlerOptions(redis, makeLogger(), url));

    // Omitting `storage` lets @nestjs/throttler use its default — correct for one process.
    expect(options.storage).toBeUndefined();
  });

  it('warns when falling back, so it cannot be mistaken for distributed limiting', () => {
    const logger = makeLogger();
    buildThrottlerOptions(redis, logger, undefined);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('per-process'));
  });

  it.each([
    ['redis://localhost:6380', 'with Redis'],
    [undefined, 'without Redis'],
  ])('keeps the configured limits unchanged %s', (url, _label) => {
    // This change moves where counters live; it must not alter the limits themselves.
    const options = asRecord(buildThrottlerOptions(redis, makeLogger(), url));

    expect(options.throttlers).toEqual([
      expect.objectContaining({
        name: 'default',
        ttl: GLOBAL_THROTTLER.ttl,
        limit: GLOBAL_THROTTLER.limit,
      }),
    ]);
    expect(GLOBAL_THROTTLER).toEqual({ name: 'default', ttl: 60000, limit: 300 });
  });

  it('names the throttler `default` so `@Throttle()` overrides bind to it', () => {
    // The guard reads override metadata keyed on the throttler's own name. Any other name
    // detaches every `@Throttle({ default: ... })` on the auth routes without failing anywhere.
    const options = asRecord(buildThrottlerOptions(redis, makeLogger(), undefined));

    expect(options.throttlers[0].name).toBe('default');
  });
});
