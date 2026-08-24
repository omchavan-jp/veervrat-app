import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readServerRuntimeConfig } from '@/lib/runtime-config';

const KEYS = ['SENTRY_DSN', 'ENVIRONMENT', 'API_BASE_URL', 'SITE_URL'] as const;
const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) original[k] = process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
});

describe('readServerRuntimeConfig — sentryDsn', () => {
  it('is undefined when SENTRY_DSN is unset', () => {
    delete process.env.SENTRY_DSN;
    expect(readServerRuntimeConfig().sentryDsn).toBeUndefined();
  });

  it('is undefined for the Terraform placeholder', () => {
    // Terraform creates the Key Vault secret but never its value. Believing tracking is
    // configured because *a* string is present, rather than a real DSN, is the exact illusion
    // the api-side equivalent (resolveSentryConfig) exists to prevent.
    process.env.SENTRY_DSN = 'placeholder-set-out-of-band';
    expect(readServerRuntimeConfig().sentryDsn).toBeUndefined();
  });

  it('is undefined for whitespace', () => {
    process.env.SENTRY_DSN = '   ';
    expect(readServerRuntimeConfig().sentryDsn).toBeUndefined();
  });

  it('passes through a real-looking DSN unchanged', () => {
    process.env.SENTRY_DSN = 'https://key@o123.ingest.de.sentry.io/456';
    expect(readServerRuntimeConfig().sentryDsn).toBe('https://key@o123.ingest.de.sentry.io/456');
  });

  it('trims surrounding whitespace from an otherwise valid value', () => {
    process.env.SENTRY_DSN = '  https://key@o123.ingest.de.sentry.io/456  ';
    expect(readServerRuntimeConfig().sentryDsn).toBe('https://key@o123.ingest.de.sentry.io/456');
  });
});
