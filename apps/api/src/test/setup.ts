import { config } from 'dotenv';
import { resolve } from 'path';
import Redis from 'ioredis';

// Load test environment variables before anything else
config({ path: resolve(__dirname, '../../.env.test') });

// Integration tests share one Redis DB (see .env.test) and run serially in one process, so
// rate-limit counters from an earlier test/file otherwise leak into the next one — e.g. a test
// that intentionally trips a login throttle poisons every subsequent login in the suite. Reset
// only the throttler's own keys before each test; `lockout:*` (a separate namespace) is left
// alone, since account-lockout tests need their own counter to accumulate across requests.
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380/1', { lazyConnect: true });

async function throttlerKeys(): Promise<string[]> {
  await redis.connect().catch(() => undefined); // no-op if already connected
  const keys = await redis.keys('{*}:*');
  return keys.filter((k) => !k.startsWith('lockout:'));
}

export async function resetRateLimits(): Promise<void> {
  const keys = await throttlerKeys();
  if (keys.length > 0) await redis.del(...keys);
}

export async function throttlerKeyCount(): Promise<number> {
  return (await throttlerKeys()).length;
}

beforeEach(async () => {
  await resetRateLimits();
});

afterAll(async () => {
  await redis.quit();
});
