import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * A dead session must present as "logged out", not as a broken app.
 *
 * Reproduced by hand on UAT: after signing out in a second window, the first window kept
 * rendering the signed-in shell and every data request 401'd behind generic "please try again"
 * panels. Only a manual refresh redirected. The user was, in effect, shown a broken product
 * instead of a login page.
 */
describe('401 handling ends the session', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  async function load() {
    vi.doMock('@/lib/runtime-config', () => ({
      getRuntimeConfig: () => ({ apiBaseUrl: 'http://api.test/api/v1' }),
    }));
    return import('@/lib/api/client');
  }

  function mockStatus(status: number) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: status < 400,
        status,
        json: async () => ({ error: 'SESSION_EXPIRED', message: 'expired' }),
      }),
    );
  }

  it('a 401 on a normal request signals the session ended', async () => {
    const { api, setUnauthorizedHandler } = await load();
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockStatus(401);

    await expect(api.get('/journeys')).rejects.toThrow();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  // A 401 from /auth/me is the ANSWER ("nobody is signed in"), not a failure. Firing here would
  // trigger a sign-out on every anonymous page load.
  it('a 401 from /auth/me does NOT signal a session end', async () => {
    const { api, setUnauthorizedHandler } = await load();
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockStatus(401);

    await expect(api.get('/auth/me')).rejects.toThrow();

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  // 403 is a permission decision, not a dead session. Signing someone out for opening a page
  // they may not see would be worse than the bug this fixes.
  it('a 403 does NOT signal a session end', async () => {
    const { api, setUnauthorizedHandler } = await load();
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockStatus(403);

    await expect(api.get('/admin/users')).rejects.toThrow();

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
