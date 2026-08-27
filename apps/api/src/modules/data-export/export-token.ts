import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed, self-contained data-export tokens.
 *
 * No database table, no cleanup job. The token encodes:
 *   userId + expiresAt + HMAC(userId | expiresAt, secret)
 *
 * The secret is SESSION_SECRET — already required, already ≥ 32 chars, and already the
 * strongest secret the app holds. A distinct signing key would be a second secret to rotate
 * for the same trust level; using the session secret with a domain prefix avoids that.
 */

const PREFIX = 'veervrat-data-export:';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function sign(payload: string, secret: string): string {
  return createHmac('sha256', PREFIX + secret)
    .update(payload)
    .digest('hex');
}

/** Create a token that lets `userId` download their export for 24 hours. */
export function createExportToken(userId: string, secret: string): string {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  const sig = sign(payload, secret);
  // base64url so it's safe in a URL path segment without encoding
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

/**
 * Verify and decode a token. Returns `userId` on success, `null` on any failure.
 *
 * Failures: malformed, expired, wrong signature, wrong secret. All look the same to the
 * caller — a token that does not verify is simply not honoured, and the distinction between
 * "expired" and "forged" is not the caller's concern.
 */
export function verifyExportToken(token: string, secret: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [userId, expiresAtStr, sig] = parts;
    const payload = `${userId}.${expiresAtStr}`;
    const expected = sign(payload, secret);
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    if (Date.now() > Number(expiresAtStr)) return null;
    return userId;
  } catch {
    return null;
  }
}
