import { describe, it, expect, afterEach } from 'vitest';
import { apiBase } from '@/proxy';

/**
 * The proxy makes one server-to-server call per request — `/auth/me`, to resolve the session
 * from a cookie the browser cannot read. Sent to the public origin it leaves the environment
 * and comes back, adding latency to every server-rendered page and making a cold api something
 * the proxy waits on. A proxy that times out reports no user, and the layout reads that as
 * "signed out".
 *
 * Read per call, never cached at module scope: a module-scope `process.env` read can be frozen
 * into the middleware bundle at build time, which is how prod's web tier once pointed at UAT's
 * api (21_Infrastructure-Conventions §17). The last test here is what would catch that.
 */
const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('proxy apiBase', () => {
  it('prefers the internal URL when the environment defines one', () => {
    process.env.API_INTERNAL_URL = 'http://veervrat-uat-api/api/v1';
    process.env.API_BASE_URL = 'https://api.uat.example.org/api/v1';

    expect(apiBase()).toBe('http://veervrat-uat-api/api/v1');
  });

  it('falls back to the public URL when no internal one is set', () => {
    delete process.env.API_INTERNAL_URL;
    process.env.API_BASE_URL = 'https://api.uat.example.org/api/v1';

    // Every environment that has not defined an internal URL keeps working exactly as before.
    expect(apiBase()).toBe('https://api.uat.example.org/api/v1');
  });

  it('falls back to localhost when neither is set', () => {
    delete process.env.API_INTERNAL_URL;
    delete process.env.API_BASE_URL;

    expect(apiBase()).toBe('http://localhost:3001/api/v1');
  });

  it('ignores an empty internal URL rather than calling the empty string', () => {
    // An unset Container Apps env var arrives as "", not undefined.
    process.env.API_INTERNAL_URL = '';
    process.env.API_BASE_URL = 'https://api.uat.example.org/api/v1';

    expect(apiBase()).toBe('https://api.uat.example.org/api/v1');
  });

  it('re-reads the environment on every call, so nothing is frozen at build time', () => {
    process.env.API_INTERNAL_URL = 'http://first/api/v1';
    expect(apiBase()).toBe('http://first/api/v1');

    process.env.API_INTERNAL_URL = 'http://second/api/v1';
    expect(apiBase()).toBe('http://second/api/v1');
  });
});
