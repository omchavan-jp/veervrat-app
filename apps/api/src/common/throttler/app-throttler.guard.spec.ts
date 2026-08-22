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
