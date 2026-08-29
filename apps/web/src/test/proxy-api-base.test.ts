import { describe, it, expect, afterEach } from 'vitest';
import { internalApiBase, publicApiBase } from '@/proxy';

/**
 * The proxy makes one server-to-server call per request — `/auth/me`, to resolve the session
 * from a cookie the browser cannot read. Sent to the public origin it leaves the environment and
 * comes back, adding latency to every server-rendered page and making a cold api something the
 * proxy waits on.
 *
 * Read per call, never cached at module scope: a module-scope `process.env` read can be frozen
 * into the middleware bundle at build time, which is how prod's web tier once pointed at UAT's
 * api (21_Infrastructure-Conventions §17). The last test here is what would catch that.
 */
const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('proxy api addresses', () => {
  it('reports the internal address when one is configured', () => {
    process.env.API_INTERNAL_URL = 'http://veervrat-uat-api/api/v1';
    expect(internalApiBase()).toBe('http://veervrat-uat-api/api/v1');
  });

  it('reports null when there is no internal address', () => {
    delete process.env.API_INTERNAL_URL;
    // Null rather than a fallback string: the caller has to decide whether to try it at all,
    // and "not configured" is a different thing from "configured as the public URL".
    expect(internalApiBase()).toBeNull();
  });

  it('treats an empty internal address as unset', () => {
    // An unset Container Apps env var arrives as "", not undefined.
    process.env.API_INTERNAL_URL = '';
    expect(internalApiBase()).toBeNull();
  });

  it('the public address is what the browser and the fallback use', () => {
    process.env.API_BASE_URL = 'https://api.uat.example.org/api/v1';
    expect(publicApiBase()).toBe('https://api.uat.example.org/api/v1');
  });

  it('falls back to localhost when nothing is set', () => {
    delete process.env.API_BASE_URL;
    expect(publicApiBase()).toBe('http://localhost:3001/api/v1');
  });

  it('re-reads the environment on every call, so nothing is frozen at build time', () => {
    process.env.API_INTERNAL_URL = 'http://first/api/v1';
    expect(internalApiBase()).toBe('http://first/api/v1');

    process.env.API_INTERNAL_URL = 'http://second/api/v1';
    expect(internalApiBase()).toBe('http://second/api/v1');
  });

  it('the two are independent — an internal address does not change the public one', () => {
    process.env.API_INTERNAL_URL = 'http://veervrat-uat-api/api/v1';
    process.env.API_BASE_URL = 'https://api.uat.example.org/api/v1';

    // The browser keeps using the public origin, so cookie scope and CORS are untouched.
    expect(publicApiBase()).toBe('https://api.uat.example.org/api/v1');
    expect(internalApiBase()).toBe('http://veervrat-uat-api/api/v1');
  });
});
