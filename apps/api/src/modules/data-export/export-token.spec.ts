import { createHmac } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { createExportToken, verifyExportToken } from './export-token';

const SECRET = 'test-secret-at-least-32-characters-long-xxxxx';
const USER_ID = 'user-abc-123';

describe('export-token', () => {
  it('round-trips: create → verify returns the userId', () => {
    const token = createExportToken(USER_ID, SECRET);
    expect(verifyExportToken(token, SECRET)).toBe(USER_ID);
  });

  it('rejects a token signed with a different secret', () => {
    const token = createExportToken(USER_ID, SECRET);
    expect(verifyExportToken(token, 'wrong-secret-at-least-32-characters-long')).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyExportToken('not-a-real-token', SECRET)).toBeNull();
    expect(verifyExportToken('', SECRET)).toBeNull();
  });

  it('rejects an expired token', () => {
    // Forge a token with an expiry in the past by manipulating the internals.
    // The token format is base64url(userId.expiresAt.hmac).
    const expiresAt = Date.now() - 1000;
    const payload = `${USER_ID}.${expiresAt}`;
    const sig = createHmac('sha256', 'veervrat-data-export:' + SECRET)
      .update(payload)
      .digest('hex');
    const token = Buffer.from(`${payload}.${sig}`).toString('base64url');

    expect(verifyExportToken(token, SECRET)).toBeNull();
  });
});
