import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/product-docs/[[...path]]/route';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(path: string, cookie?: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { ...(cookie ? { Cookie: `veervrat_session=${cookie}` } : {}), ...headers },
  });
}

describe('product docs gateway', () => {
  it('returns 404 before any network call when disabled', async () => {
    vi.stubEnv('PRODUCT_DOCS_MODE', 'off');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await GET(request('/product-docs/diagrams/product-foundation.svg', 'session'));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forces production off even if the mode variable is set to granted', async () => {
    vi.stubEnv('ENVIRONMENT', 'prod');
    vi.stubEnv('PRODUCT_DOCS_MODE', 'granted');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await GET(request('/product-docs', 'session'));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redirects an anonymous document request to login with a safe return path', async () => {
    vi.stubEnv('PRODUCT_DOCS_MODE', 'granted');
    const response = await GET(
      request('/product-docs/01-product-model?tab=a', undefined, { Accept: 'text/html' }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      '/login?returnTo=%2Fproduct-docs%2F01-product-model%3Ftab%3Da',
    );
  });

  it('denies an authenticated user without the capability', async () => {
    vi.stubEnv('PRODUCT_DOCS_MODE', 'granted');
    const fetchMock = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await GET(request('/product-docs', 'session'));
    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends an expired session back through login', async () => {
    vi.stubEnv('PRODUCT_DOCS_MODE', 'granted');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const response = await GET(
      request('/product-docs/00-governance/decision-log', 'expired', { Accept: 'text/html' }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?returnTo=');
  });

  it('forwards allowed pages and assets under the protected prefix without identity headers', async () => {
    vi.stubEnv('PRODUCT_DOCS_MODE', 'granted');
    vi.stubEnv('PRODUCT_DOCS_INTERNAL_URL', 'http://docs-internal:3000');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"data":{"allowed":true}}', { status: 200 }))
      .mockResolvedValueOnce(
        new Response('asset', {
          status: 200,
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600',
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const response = await GET(
      request('/product-docs/_next/static/chunk.js?v=1', 'session', {
        RSC: '1',
        'X-Session-User': 'forged',
        Authorization: 'Bearer forged',
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('asset');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock.mock.calls[1][0].toString()).toBe(
      'http://docs-internal:3000/product-docs/_next/static/chunk.js?v=1',
    );
    const forwarded = fetchMock.mock.calls[1][1].headers as Headers;
    expect(forwarded.get('rsc')).toBe('1');
    expect(forwarded.has('cookie')).toBe(false);
    expect(forwarded.has('x-session-user')).toBe(false);
    expect(forwarded.has('authorization')).toBe(false);
  });

  it('fails closed when API access validation fails', async () => {
    vi.stubEnv('PRODUCT_DOCS_MODE', 'granted');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unavailable')));
    const response = await GET(request('/product-docs', 'session'));
    expect(response.status).toBe(503);
  });
});
