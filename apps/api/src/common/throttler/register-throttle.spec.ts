import { describe, it, expect, afterEach } from 'vitest';
import { registerThrottle, REGISTER_LIMIT_DEFAULT } from './throttler-config.factory';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('registerThrottle — a test seam that cannot weaken production', () => {
  it('defaults to 5 per hour when nothing is set', () => {
    delete process.env.AUTH_REGISTER_LIMIT;
    process.env.NODE_ENV = 'development';

    expect(registerThrottle()).toEqual({ ttl: 3600000, limit: REGISTER_LIMIT_DEFAULT });
  });

  it('honours the override outside production, so the e2e suite can register its accounts', () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_REGISTER_LIMIT = '200';

    expect(registerThrottle().limit).toBe(200);
  });

  // The whole reason the seam is safe. UAT and prod both run NODE_ENV=production, so an
  // environment variable set there — by accident, by a copied config, or by someone in a
  // hurry — must not open the door.
  it('IGNORES the override in production, however it is set', () => {
    process.env.NODE_ENV = 'production';

    for (const attempt of ['200', '1000000', '999']) {
      process.env.AUTH_REGISTER_LIMIT = attempt;
      expect(registerThrottle().limit).toBe(REGISTER_LIMIT_DEFAULT);
    }
  });

  it('falls back to the default for a value that is not a usable number', () => {
    process.env.NODE_ENV = 'development';

    for (const junk of ['', 'lots', '0', '-5', 'NaN']) {
      process.env.AUTH_REGISTER_LIMIT = junk;
      expect(registerThrottle().limit).toBe(REGISTER_LIMIT_DEFAULT);
    }
  });
});
