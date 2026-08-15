import { describe, it, expect, afterEach } from 'vitest';
import { resolvePoolMax } from './prisma.service';

const original = process.env.DATABASE_POOL_MAX;

afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_POOL_MAX;
  else process.env.DATABASE_POOL_MAX = original;
});

describe('resolvePoolMax', () => {
  it('uses the configured value', () => {
    process.env.DATABASE_POOL_MAX = '5';
    expect(resolvePoolMax()).toBe(5);
  });

  it('defaults to 10 when unset, matching the driver default so nothing regresses', () => {
    delete process.env.DATABASE_POOL_MAX;
    expect(resolvePoolMax()).toBe(10);
  });

  it.each(['0', '-1', 'abc', '2.5'])(
    'falls back to the default for the invalid value %o',
    (raw) => {
      // Joi rejects these at boot; this is the second line of defence, since a zero or negative
      // pool would deadlock every query rather than fail loudly.
      process.env.DATABASE_POOL_MAX = raw;
      expect(resolvePoolMax()).toBe(10);
    },
  );
});
