import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Capture the request headers passed to NextResponse.next({ request: { headers } })
// — the middleware now sets X-Next-Locale on the forwarded request headers, not response headers.
let capturedRequestHeaders: Headers | null = null;
// Captures response.cookies.set(...) calls (the NEXT_LOCALE self-heal).
let setResponseCookies: Array<{ name: string; value: string }> = [];

vi.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    cookies: { get: (name: string) => { value: string } | undefined };
    headers: Headers;

    constructor(
      url: string,
      init?: { headers?: Record<string, string>; cookies?: Record<string, string> },
    ) {
      this.url = url;
      const cookieMap = init?.cookies ?? {};
      const headerMap: Record<string, string> = {};
      for (const [k, v] of Object.entries(init?.headers ?? {})) {
        headerMap[k.toLowerCase()] = v;
      }
      this.cookies = {
        get: (name: string) =>
          cookieMap[name] !== undefined ? { value: cookieMap[name] } : undefined,
      };
      this.headers = new Headers(headerMap);
    }
  }

  const NextResponse = {
    next: (opts?: { request?: { headers?: Headers } }) => {
      capturedRequestHeaders = opts?.request?.headers ?? null;
      return {
        headers: { set: () => {}, get: () => undefined },
        cookies: {
          set: (name: string, value: string) => {
            setResponseCookies.push({ name, value });
          },
        },
      };
    },
  };

  return { NextRequest: MockNextRequest, NextResponse };
});

import { proxy as middleware } from '../../proxy';

describe('middleware locale resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedRequestHeaders = null;
    setResponseCookies = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets X-Next-Locale: mr for authenticated user with language mr', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { language: 'mr' } }),
      }),
    );

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (
      url: string,
      init?: { cookies?: Record<string, string> },
    ) => unknown)('http://localhost/dashboard', { cookies: { veervrat_session: 'valid-token' } });

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('mr');
  });

  it('sets X-Next-Locale: en for authenticated user with language en', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { language: 'en' } }),
      }),
    );

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (
      url: string,
      init?: { cookies?: Record<string, string> },
    ) => unknown)('http://localhost/dashboard', { cookies: { veervrat_session: 'valid-token' } });

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('en');
  });

  it('does not call fetch and defaults to en for guest with no session cookie', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (url: string) => unknown)(
      'http://localhost/login',
    );

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('en');
  });

  it('sets X-Next-Locale: mr for guest whose Accept-Language contains mr', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (
      url: string,
      init?: { headers?: Record<string, string> },
    ) => unknown)('http://localhost/login', {
      headers: { 'accept-language': 'mr-IN,mr;q=0.9,en;q=0.8' },
    });

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('mr');
  });

  it('falls back to en when API returns non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (
      url: string,
      init?: { cookies?: Record<string, string> },
    ) => unknown)('http://localhost/dashboard', { cookies: { veervrat_session: 'expired-token' } });

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('en');
  });

  it('falls back to en when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (
      url: string,
      init?: { cookies?: Record<string, string> },
    ) => unknown)('http://localhost/dashboard', { cookies: { veervrat_session: 'valid-token' } });

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('en');
  });

  // The fast path narrowed deliberately (openspec/changes/server-resolved-auth). It used to skip
  // the API for ANY request with a cached locale cookie. Signed-in users now always resolve the
  // session server-side, so the client can render with auth already known instead of fetching it
  // and gating the whole tree on a spinner — the shape that caused the #101 request storm.
  it('signed in: resolves the session even when NEXT_LOCALE is cached', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'u1', language: 'MR', displayName: 'Om' } }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (
      url: string,
      init?: { cookies?: Record<string, string> },
    ) => unknown)('http://localhost/dashboard', {
      cookies: { veervrat_session: 'valid-token', NEXT_LOCALE: 'en' },
    });

    await middleware(req as Parameters<typeof middleware>[0]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // The user's stored language wins over the cached cookie — otherwise a language change made
    // on another device would be masked by a stale cookie for up to a year.
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('mr');
    expect(capturedRequestHeaders?.get('X-Session-User')).toBeTruthy();
  });

  // Anonymous visitors keep the fast path in full: public pages are the most trafficked and must
  // not gain a round trip. resolveUser returns null without touching the API when there is no
  // session cookie.
  it('anonymous: uses the NEXT_LOCALE cookie and never calls the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (
      url: string,
      init?: { cookies?: Record<string, string> },
    ) => unknown)('http://localhost/login', { cookies: { NEXT_LOCALE: 'mr' } });

    await middleware(req as Parameters<typeof middleware>[0]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('mr');
    expect(capturedRequestHeaders?.get('X-Session-User')).toBeNull();
    expect(setResponseCookies).toHaveLength(0);
  });

  it('a failed /auth/me degrades to anonymous rather than erroring', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('api unreachable')));

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (
      url: string,
      init?: { cookies?: Record<string, string> },
    ) => unknown)('http://localhost/dashboard', { cookies: { veervrat_session: 'valid-token' } });

    // The site should look logged out, not break, if the api is down.
    await middleware(req as Parameters<typeof middleware>[0]);

    expect(capturedRequestHeaders?.get('X-Session-User')).toBeNull();
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBeTruthy();
  });
});
