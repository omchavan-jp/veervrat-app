import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { rateLimitRetryAfter } from '@/lib/api/rate-limit';

const err = (code: string, details?: unknown) => new ApiError(429, code, 'msg', details);

describe('rateLimitRetryAfter', () => {
  it('reads the throttler countdown', () => {
    expect(rateLimitRetryAfter(err('RATE_LIMITED', { retryAfterSeconds: 30 }))).toBe(30);
  });

  it('reads the account-lockout countdown from its differently-named field', () => {
    // Two mechanisms, two field names, one experience. If this fell through, a locked-out user
    // would drop back to the raw English server message.
    expect(rateLimitRetryAfter(err('ACCOUNT_LOCKED', { secondsRemaining: 900 }))).toBe(900);
  });

  it('returns null for errors that are not about rate limiting', () => {
    expect(rateLimitRetryAfter(err('INVALID_CREDENTIALS'))).toBeNull();
    expect(rateLimitRetryAfter(new Error('network'))).toBeNull();
    expect(rateLimitRetryAfter(undefined)).toBeNull();
  });

  it('still reports a rate limit when the countdown is missing or unusable', () => {
    // Zero, not null: the wait is unknown, but the refusal is not. Returning null would send the
    // user back to the generic message this exists to replace.
    expect(rateLimitRetryAfter(err('RATE_LIMITED'))).toBe(0);
    expect(rateLimitRetryAfter(err('RATE_LIMITED', { retryAfterSeconds: 'soon' }))).toBe(0);
    expect(rateLimitRetryAfter(err('RATE_LIMITED', { retryAfterSeconds: -5 }))).toBe(0);
    expect(rateLimitRetryAfter(err('RATE_LIMITED', { retryAfterSeconds: Infinity }))).toBe(0);
  });

  it('rounds up, so the advertised wait never expires early', () => {
    expect(rateLimitRetryAfter(err('RATE_LIMITED', { retryAfterSeconds: 30.2 }))).toBe(31);
  });
});
