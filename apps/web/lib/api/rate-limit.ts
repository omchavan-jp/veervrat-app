import { ApiError } from './client';

/**
 * How long the caller must wait, in whole seconds, or `null` if this is not a rate-limit error.
 *
 * `RATE_LIMITED` (the throttler) and `ACCOUNT_LOCKED` (repeated failed logins) are different
 * mechanisms, but to the person on the other end they are the same event — "you have done this
 * too many times, wait" — and both answer 429 with a seconds count. Callers should not have to
 * know which layer refused them.
 */
export function rateLimitRetryAfter(error: unknown): number | null {
  if (!(error instanceof ApiError)) return null;
  if (error.error !== 'RATE_LIMITED' && error.error !== 'ACCOUNT_LOCKED') return null;

  const details = error.details as Record<string, unknown> | undefined;
  const seconds = details?.retryAfterSeconds ?? details?.secondsRemaining;

  // A rate-limit error with no usable countdown is still a rate-limit error. Fall back to zero
  // and let the caller show the wait-less wording rather than reporting "not rate limited",
  // which would send the user back to the generic message they were seeing before.
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.ceil(seconds);
}
