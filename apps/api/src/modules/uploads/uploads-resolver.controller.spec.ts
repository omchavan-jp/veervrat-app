import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { UploadsResolverController } from './uploads-resolver.controller';
import type { UploadsResolverService } from './uploads-resolver.service';
import type { SessionUser } from '../auth/types/auth.types';

function makeRes() {
  const headers: Record<string, unknown> = {};
  const res = {
    setHeader: vi.fn((k: string, v: unknown) => {
      headers[k.toLowerCase()] = v;
    }),
    end: vi.fn(),
    redirect: vi.fn(),
  };
  return { res: res as unknown as Response, headers, spy: res };
}

const USER = { id: 'u1' } as SessionUser;

describe('UploadsResolverController', () => {
  it('sets Cross-Origin-Resource-Policy so a browser will actually render the image', async () => {
    // The defect this exists to prevent (2026-08-25): helmet applies
    // `Cross-Origin-Resource-Policy: same-origin` globally, and the web tier is a different
    // ORIGIN from the api. A browser therefore refused to render the image and showed a broken
    // icon — while every curl-based check passed, because curl ignores CORP entirely.
    //
    // `same-site` rather than `cross-origin`: both hostnames share jnanaprabodhini.org, so this
    // is the narrowest value that works and unrelated sites still cannot embed these images.
    const resolver = {
      resolve: vi.fn().mockResolvedValue({
        kind: 'stream',
        body: Buffer.from('png-bytes'),
        contentType: 'image/png',
      }),
    };
    const { res, headers, spy } = makeRes();

    await new UploadsResolverController(resolver as unknown as UploadsResolverService).serve(
      'k.png',
      USER,
      res,
    );

    expect(headers['cross-origin-resource-policy']).toBe('same-site');
    expect(headers['content-type']).toBe('image/png');
    expect(headers['x-content-type-options']).toBe('nosniff');
    // Private, so no shared cache may hold it.
    expect(String(headers['cache-control'])).toContain('private');
    expect(spy.end).toHaveBeenCalledWith(Buffer.from('png-bytes'));
  });

  it('redirects a public image instead of streaming it, keeping it cacheable', async () => {
    const resolver = {
      resolve: vi.fn().mockResolvedValue({ kind: 'redirect', url: 'https://cdn.example/k.png' }),
    };
    const { res, spy } = makeRes();

    await new UploadsResolverController(resolver as unknown as UploadsResolverService).serve(
      'k.png',
      undefined,
      res,
    );

    expect(spy.redirect).toHaveBeenCalledWith(302, 'https://cdn.example/k.png');
    expect(spy.end).not.toHaveBeenCalled();
  });
});
