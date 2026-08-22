import { describe, it, expect, vi } from 'vitest';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import { AppThrottlerGuard } from './app-throttler.guard';
import { RateLimitedException } from '../exceptions/app.exceptions';

class TestGuard extends AppThrottlerGuard {
  constructor() {
    super({ throttlers: [] }, {} as never, {} as never);
  }
  public throwFor(context: unknown, detail: Partial<ThrottlerLimitDetail>) {
    return this['throwThrottlingException'](context as never, detail as never);
  }
}

function makeContext() {
  const setHeader = vi.fn();
  return {
    context: { switchToHttp: () => ({ getResponse: () => ({ setHeader }) }) },
    setHeader,
  };
}

async function capture(detail: Partial<ThrottlerLimitDetail>) {
  const { context, setHeader } = makeContext();
  const error = await new TestGuard()
    .throwFor(context, detail)
    .then(() => null)
    .catch((e: unknown) => e);
  return { error, setHeader };
}

describe('AppThrottlerGuard', () => {
  it("throws this codebase's exception, not the framework's string-bodied one", async () => {
    const { error } = await capture({ timeToExpire: 30, timeToBlockExpire: 0 });

    expect(error).toBeInstanceOf(RateLimitedException);
    const body = (error as RateLimitedException).getResponse() as Record<string, unknown>;
    expect(body.error).toBe('RATE_LIMITED');
    expect(body.details).toEqual({ retryAfterSeconds: 30 });
  });

  it('sets Retry-After so clients that honour it back off without parsing the body', async () => {
    const { setHeader } = await capture({ timeToExpire: 30, timeToBlockExpire: 0 });
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '30');
  });

  it('prefers an explicit block duration over the window rollover', async () => {
    const { error } = await capture({ timeToExpire: 5, timeToBlockExpire: 600 });
    expect((error as RateLimitedException).getResponse()).toMatchObject({
      details: { retryAfterSeconds: 600 },
    });
  });

  it('never reports zero seconds', async () => {
    // "Try again in 0 seconds" invites an immediate retry, which is refused again — the user
    // learns nothing and the limiter absorbs another request.
    const { error, setHeader } = await capture({ timeToExpire: 0, timeToBlockExpire: 0 });

    expect((error as RateLimitedException).getResponse()).toMatchObject({
      details: { retryAfterSeconds: 1 },
    });
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '1');
  });

  it('rounds a fractional wait up, so the retry lands after the window', async () => {
    const { error } = await capture({ timeToExpire: 4.2, timeToBlockExpire: 0 });
    expect((error as RateLimitedException).getResponse()).toMatchObject({
      details: { retryAfterSeconds: 5 },
    });
  });
});

describe('AppThrottlerGuard.generateKey', () => {
  class KeyGuard extends AppThrottlerGuard {
    constructor() {
      super({ throttlers: [] }, {} as never, {} as never);
    }
    public keyFor(body: unknown, name: string, ip = '1.2.3.4') {
      const context = {
        switchToHttp: () => ({ getRequest: () => ({ body }) }),
        getHandler: () => function handler() {},
        getClass: () => class Controller {},
      };
      return this['generateKey'](context as never, ip, name);
    }
  }

  const guard = () => new KeyGuard();

  it('separates two people behind one IP who are logging into different accounts', () => {
    // The shared-NAT case from #76: a school or office where ten failed logins is five people
    // having a bad morning, not an attack. Different accounts must not share a counter.
    const g = guard();
    expect(g.keyFor({ email: 'a@x.com' }, 'identity')).not.toBe(
      g.keyFor({ email: 'b@x.com' }, 'identity'),
    );
  });

  it('keeps the same person on one counter from one IP', () => {
    const g = guard();
    expect(g.keyFor({ email: 'a@x.com' }, 'identity')).toBe(
      g.keyFor({ email: 'a@x.com' }, 'identity'),
    );
  });

  it('still separates the same account attempted from different IPs', () => {
    const g = guard();
    expect(g.keyFor({ email: 'a@x.com' }, 'identity', '1.1.1.1')).not.toBe(
      g.keyFor({ email: 'a@x.com' }, 'identity', '2.2.2.2'),
    );
  });

  it('treats casing and surrounding space as the same account', () => {
    // Otherwise ' A@X.com ' and 'a@x.com' get a counter each and the limit is trivially evaded.
    const g = guard();
    expect(g.keyFor({ email: '  A@X.com ' }, 'identity')).toBe(
      g.keyFor({ email: 'a@x.com' }, 'identity'),
    );
  });

  it('never puts the address itself in the key', () => {
    // Redis keys surface in slow logs, KEYS output and memory dumps.
    expect(guard().keyFor({ email: 'someone@example.com' }, 'identity')).not.toContain(
      'someone@example.com',
    );
  });

  it('falls back to per-IP counting when there is no email', () => {
    // Not one shared key for all such requests — that would let unrelated callers exhaust
    // each other.
    const g = guard();
    expect(g.keyFor({}, 'identity', '1.1.1.1')).not.toBe(g.keyFor({}, 'identity', '2.2.2.2'));
    expect(g.keyFor(undefined, 'identity')).toBe(g.keyFor({ email: 42 }, 'identity'));
  });

  it('leaves every other throttler keyed on IP alone', () => {
    const g = guard();
    expect(g.keyFor({ email: 'a@x.com' }, 'default')).toBe(
      g.keyFor({ email: 'b@x.com' }, 'default'),
    );
  });
});
