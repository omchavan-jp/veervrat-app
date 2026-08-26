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

/**
 * A second throttler keyed on **who is being targeted**, not just where the request came from.
 *
 * `default` counts per IP. That is the wrong unit for credential attacks in two directions at
 * once:
 *
 *   - **It punishes the innocent.** Vratarthi behind one school or office NAT share an IP.
 *     Ten failed logins from a building is five people having a bad morning, not an attack, and
 *     a tight per-IP limit makes them throttle each other.
 *   - **It made account lockout unreachable.** `14_Auth-Architecture-Decision.md` §16 specifies
 *     a lockout after 10 failed logins for an email. Login was throttled at 10 per IP over the
 *     same window, and the guard runs *before* the service, so the throttler always answered
 *     first and `ACCOUNT_LOCKED` never ran in production. It survived only in a test that reset
 *     the IP counter first — a workaround for a real defect, removed with this change.
 *
 * So this throttler keys on the email being attempted *and* the IP (see
 * `AppThrottlerGuard.generateKey`), and auth routes set it **looser than the lockout
 * threshold** so the lockout fires first and the throttler stays the outer backstop. The per-IP
 * `default` limit stays on those routes too, generous enough not to catch a shared NAT but
 * still capping someone spraying many addresses from one place.
 *
 * The global limit here is deliberately enormous: this throttler is meant to do nothing at all
 * except where a route opts in with `@Throttle({ identity: ... })`.
 */
export const IDENTITY_THROTTLER = { name: 'identity', ttl: 900000, limit: 1_000_000 } as const;

/**
 * Registration: 5 per hour per IP.
 *
 * The limit is configurable for one reason, and it is not "tests are inconvenient". The e2e
 * suite registers roughly fifteen accounts from a single IP inside two minutes, because that is
 * what exercising ten user journeys end to end requires. Against a 5/hour limit the suite and
 * the control are structurally incompatible: five of its ten flows failed on HTTP 429 before
 * reaching a single assertion. That is why the suite had never run in CI.
 *
 * **The override cannot loosen production.** `NODE_ENV === 'production'` — which is what UAT and
 * prod both run — pins the limit at 5 regardless of what the environment says. The seam exists
 * for local and CI runs, where the throttle is protecting nothing, and it cannot be widened
 * where it protects something.
 */
export const REGISTER_LIMIT_DEFAULT = 5;

export function registerThrottle(): { ttl: number; limit: number } {
  const override = Number(process.env.AUTH_REGISTER_LIMIT);
  const overridable =
    process.env.NODE_ENV !== 'production' && Number.isFinite(override) && override > 0;
  return { ttl: 3600000, limit: overridable ? override : REGISTER_LIMIT_DEFAULT };
}

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
  const throttlers = [{ ...GLOBAL_THROTTLER }, { ...IDENTITY_THROTTLER }];

  if (!redisUrl) {
    logger.warn('REDIS_URL not set — rate limits are per-process only (single replica)');
    return { throttlers };
  }

  return { throttlers, storage: new ThrottlerStorageRedisService(redis) };
}
