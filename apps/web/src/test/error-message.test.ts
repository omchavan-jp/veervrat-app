import { describe, it, expect } from 'vitest';
import { errorMessage } from '@/lib/api/error-message';
import { ApiError } from '@/lib/api/client';

const FALLBACK = "Couldn't send the invitation";

describe('errorMessage — which server text a person is allowed to see', () => {
  it('surfaces a 4xx message, because that is the API telling them what to do', () => {
    const err = new ApiError(
      409,
      'PENDING_GLOBAL_VM_INVITE_EXISTS',
      'A pending global VM invitation already exists. Cancel it before sending a new one.',
    );

    expect(errorMessage(err, FALLBACK)).toBe(
      'A pending global VM invitation already exists. Cancel it before sending a new one.',
    );
  });

  it('hides a 5xx message, which is written for a log rather than a person', () => {
    // An unhandled error already returns a generic string, but an HttpException thrown with a
    // 5xx status carries whatever the thrower wrote. That is not for a user to read.
    const err = new ApiError(500, 'INTERNAL_ERROR', 'connect ECONNREFUSED 10.0.0.4:5432');

    expect(errorMessage(err, FALLBACK)).toBe(FALLBACK);
  });

  it('falls back for a network failure, which carries no server message at all', () => {
    expect(errorMessage(new TypeError('Failed to fetch'), FALLBACK)).toBe(FALLBACK);
  });

  it('falls back when the server sent an empty message rather than showing a blank toast', () => {
    expect(errorMessage(new ApiError(400, 'VALIDATION_ERROR', '   '), FALLBACK)).toBe(FALLBACK);
  });

  it('falls back for a non-error value', () => {
    expect(errorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(errorMessage('boom', FALLBACK)).toBe(FALLBACK);
  });
});
