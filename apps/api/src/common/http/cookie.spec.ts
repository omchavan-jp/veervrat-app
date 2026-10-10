import { afterEach, describe, expect, it, vi } from 'vitest';
import { authCookieOptions } from './cookie';

afterEach(() => vi.unstubAllEnvs());

describe('session-cookie security', () => {
  it('requires HTTPS and HttpOnly in production while preserving the configured scope', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SAMESITE', 'lax');
    vi.stubEnv('COOKIE_DOMAIN', '.example.test');
    expect(authCookieOptions({ httpOnly: true, maxAgeMs: 60000 })).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: '.example.test',
      path: '/',
      maxAge: 60000,
    });
  });

  it('does not require HTTPS for local development but keeps the session HttpOnly', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('COOKIE_SAMESITE', 'lax');
    vi.stubEnv('COOKIE_DOMAIN', '');
    const options = authCookieOptions({ httpOnly: true });
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.domain).toBeUndefined();
  });
});
