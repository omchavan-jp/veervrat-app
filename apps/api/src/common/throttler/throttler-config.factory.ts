import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type Redis from 'ioredis';

/**
 * Limits are unchanged from the original `forRoot` call — this change moves storage, not limits.
 *
 * The name must stay `default`: the guard resolves per-route overrides by looking up metadata
 * keyed on the *throttler's* name, while `@Throttle({ default: ... })` writes them under
 * `default`. Under the previous name (`global`) no key ever matched, so the tight auth limits
 * (5/hour on register, forgot-password and reset-password; 10/15min on login) silently fell back
 * to the 300/minute global bucket.
 */
export const GLOBAL_THROTTLER = { name: 'default', ttl: 60000, limit: 300 } as const;

export interface ThrottlerFactoryLogger {
  warn(message: string): void;
}

/**
 * The default storage counts per process. With N replicas that permits N× the configured limit,
 * and every deploy resets the counters — a security control (the auth brute-force throttles ride
 * on this) that silently weakens exactly as the system scales out.
 *
 * Redis is optional so the API still boots without it: for a single local process, per-process
 * counting is the correct behaviour, not a degradation. The warning exists so the fallback can
 * never be mistaken for working distributed limiting in an environment that needs it.
 */
export function buildThrottlerOptions(
  redis: Redis,
  logger: ThrottlerFactoryLogger,
  redisUrl = process.env.REDIS_URL,
): ThrottlerModuleOptions {
  const throttlers = [{ ...GLOBAL_THROTTLER }];

  if (!redisUrl) {
    logger.warn('REDIS_URL not set — rate limits are per-process only (single replica)');
    return { throttlers };
  }

  return { throttlers, storage: new ThrottlerStorageRedisService(redis) };
}
