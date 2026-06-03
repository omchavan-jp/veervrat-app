import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Capture the request headers passed to NextResponse.next({ request: { headers } })
// — the middleware now sets X-Next-Locale on the forwarded request headers, not response headers.
let capturedRequestHeaders: Headers | null = null;

vi.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    cookies: { get: (name: string) => { value: string } | undefined };
    headers: Headers;

    constructor(url: string, init?: { headers?: Record<string, string>; cookies?: Record<string, string> }) {
      this.url = url;
      const cookieMap = init?.cookies ?? {};
      const headerMap: Record<string, string> = {};
      for (const [k, v] of Object.entries(init?.headers ?? {})) {
        headerMap[k.toLowerCase()] = v;
      }
      this.cookies = {
        get: (name: string) => (cookieMap[name] !== undefined ? { value: cookieMap[name] } : undefined),
      };
      this.headers = new Headers(headerMap);
    }
  }

  const NextResponse = {
    next: (opts?: { request?: { headers?: Headers } }) => {
      capturedRequestHeaders = opts?.request?.headers ?? null;
      return { headers: { set: () => {}, get: () => undefined } };
    },
  };

  return { NextRequest: MockNextRequest, NextResponse };
});

import { proxy as middleware } from '../../proxy';

describe('middleware locale resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedRequestHeaders = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets X-Next-Locale: mr for authenticated user with language mr', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { language: 'mr' } }),
    }));

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (url: string, init?: { cookies?: Record<string, string> }) => unknown)(
      'http://localhost/dashboard',
      { cookies: { veervrat_session: 'valid-token' } },
    );

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('mr');
  });

  it('sets X-Next-Locale: en for authenticated user with language en', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { language: 'en' } }),
    }));

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (url: string, init?: { cookies?: Record<string, string> }) => unknown)(
      'http://localhost/dashboard',
      { cookies: { veervrat_session: 'valid-token' } },
    );

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('en');
  });

  it('does not call fetch and defaults to en for guest with no session cookie', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (url: string) => unknown)('http://localhost/login');

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('en');
  });

  it('sets X-Next-Locale: mr for guest whose Accept-Language contains mr', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (url: string, init?: { headers?: Record<string, string> }) => unknown)(
      'http://localhost/login',
      { headers: { 'accept-language': 'mr-IN,mr;q=0.9,en;q=0.8' } },
    );

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('mr');
  });

  it('falls back to en when API returns non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (url: string, init?: { cookies?: Record<string, string> }) => unknown)(
      'http://localhost/dashboard',
      { cookies: { veervrat_session: 'expired-token' } },
    );

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('en');
  });

  it('falls back to en when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { NextRequest } = await import('next/server');
    const req = new (NextRequest as unknown as new (url: string, init?: { cookies?: Record<string, string> }) => unknown)(
      'http://localhost/dashboard',
      { cookies: { veervrat_session: 'valid-token' } },
    );

    await middleware(req as Parameters<typeof middleware>[0]);
    expect(capturedRequestHeaders?.get('X-Next-Locale')).toBe('en');
  });
});
