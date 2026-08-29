import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * A wrong internal address must cost a failed attempt, not everybody's session.
 *
 * `resolveUser` returning null is rendered by the layout as "signed out". So if the proxy
 * committed to `API_INTERNAL_URL` and that address were wrong, every signed-in person would
 * appear signed out — which is why setting it was abandoned rather than guessed at (#240). With
 * a fallback the failure degrades to exactly the behaviour before the variable existed.
 *
 * The distinction these tests turn on: a **401 is an answer** ("nobody is signed in with that
 * cookie"), not a failure to reach the api. Retrying on it would double every request made by
 * somebody whose session had expired.
 */
const USER = { id: 'u1', email: 'a@b.c', language: 'EN' };

function jsonOk(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}
const UNAUTHORIZED = { ok: false, status: 401, json: async () => ({}) };
const REDIRECT = { ok: false, status: 307, json: async () => ({}) };
const SERVER_ERROR = { ok: false, status: 502, json: async () => ({}) };

const ORIGINAL = { ...process.env };

function requestWithSession() {
  return {
    cookies: { get: (n: string) => (n === 'veervrat_session' ? { value: 'tok' } : undefined) },
    headers: { get: () => null },
    nextUrl: { pathname: '/dashboard', search: '' },
    url: 'https://web.test/dashboard',
  };
}

/** Fresh module each time, so the internal-failure cooldown does not leak between cases. */
async function loadProxy() {
  vi.resetModules();
  return import('@/proxy');
}

beforeEach(() => {
  process.env = { ...ORIGINAL };
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.restoreAllMocks();
});

describe('resolveUser falls back when the internal address does not work', () => {
  async function run(fetchImpl: ReturnType<typeof vi.fn>) {
    vi.stubGlobal('fetch', fetchImpl);
    const { proxy } = await loadProxy();
    await proxy(requestWithSession() as never);
    return fetchImpl.mock.calls.map((c) => String(c[0]));
  }

  it('uses the internal address alone when it answers', async () => {
    process.env.API_INTERNAL_URL = 'http://internal-api/api/v1';
    process.env.API_BASE_URL = 'https://public-api.test/api/v1';
    const f = vi.fn().mockResolvedValue(jsonOk({ data: USER }));

    const urls = await run(f);

    expect(urls).toEqual(['http://internal-api/api/v1/auth/me']);
    expect(urls.some((u) => u.includes('public-api'))).toBe(false);
  });

  it('falls back to the public address when the internal one is unreachable', async () => {
    process.env.API_INTERNAL_URL = 'http://internal-api/api/v1';
    process.env.API_BASE_URL = 'https://public-api.test/api/v1';
    const f = vi
      .fn()
      .mockRejectedValueOnce(new Error('ENOTFOUND'))
      .mockResolvedValue(jsonOk({ data: USER }));

    const urls = await run(f);

    expect(urls).toEqual([
      'http://internal-api/api/v1/auth/me',
      'https://public-api.test/api/v1/auth/me',
    ]);
  });

  it('falls back on a redirect — which is what allowInsecure:false produces', async () => {
    // The api sets allowInsecure:false, so an http:// call to an in-environment name is answered
    // with a redirect to the public FQDN. Followed, it would leave the environment silently while
    // looking like success, which is the failure this whole fallback exists to make survivable.
    process.env.API_INTERNAL_URL = 'http://internal-api/api/v1';
    process.env.API_BASE_URL = 'https://public-api.test/api/v1';
    const f = vi.fn().mockResolvedValueOnce(REDIRECT).mockResolvedValue(jsonOk({ data: USER }));

    const urls = await run(f);

    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain('public-api');
  });

  it('falls back on a 5xx', async () => {
    process.env.API_INTERNAL_URL = 'http://internal-api/api/v1';
    process.env.API_BASE_URL = 'https://public-api.test/api/v1';
    const f = vi.fn().mockResolvedValueOnce(SERVER_ERROR).mockResolvedValue(jsonOk({ data: USER }));

    expect(await run(f)).toHaveLength(2);
  });

  it('does NOT fall back on a 401 — that is the answer, not a failure', async () => {
    process.env.API_INTERNAL_URL = 'http://internal-api/api/v1';
    process.env.API_BASE_URL = 'https://public-api.test/api/v1';
    const f = vi.fn().mockResolvedValue(UNAUTHORIZED);

    const urls = await run(f);

    // Retrying here would double every request from somebody whose session had expired.
    expect(urls).toEqual(['http://internal-api/api/v1/auth/me']);
  });

  it('stops retrying the internal address for a while after it fails', async () => {
    process.env.API_INTERNAL_URL = 'http://internal-api/api/v1';
    process.env.API_BASE_URL = 'https://public-api.test/api/v1';
    const f = vi.fn().mockImplementation((url: string) =>
      String(url).includes('internal-api')
        ? Promise.reject(new Error('ENOTFOUND'))
        : Promise.resolve(jsonOk({ data: USER })),
    );
    vi.stubGlobal('fetch', f);
    const { proxy } = await loadProxy();

    await proxy(requestWithSession() as never);
    await proxy(requestWithSession() as never);
    await proxy(requestWithSession() as never);

    const internalTries = f.mock.calls.filter((c) => String(c[0]).includes('internal-api'));
    // Once, not once per request — a doomed attempt on every page load would be worse than
    // never having set the variable.
    expect(internalTries).toHaveLength(1);
  });

  it('with no internal address configured, behaves exactly as before', async () => {
    delete process.env.API_INTERNAL_URL;
    process.env.API_BASE_URL = 'https://public-api.test/api/v1';
    const f = vi.fn().mockResolvedValue(jsonOk({ data: USER }));

    expect(await run(f)).toEqual(['https://public-api.test/api/v1/auth/me']);
  });

  it('makes no call at all for an anonymous visitor', async () => {
    process.env.API_INTERNAL_URL = 'http://internal-api/api/v1';
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const { proxy } = await loadProxy();

    await proxy({
      cookies: { get: () => undefined },
      headers: { get: () => null },
      nextUrl: { pathname: '/login', search: '' },
      url: 'https://web.test/login',
    } as never);

    // The busiest pages are anonymous and must not gain a round trip.
    expect(f).not.toHaveBeenCalled();
  });
});
