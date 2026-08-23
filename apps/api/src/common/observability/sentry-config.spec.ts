import { describe, it, expect } from 'vitest';
import { resolveSentryConfig } from './sentry-config';

describe('resolveSentryConfig', () => {
  it('is disabled when no DSN is set, and SAYS so', () => {
    // The whole point. The previous version was silent when unset, so an inert error tracker
    // looked identical to a working one — and stayed that way through a production readiness
    // audit that recorded it as DONE.
    const config = resolveSentryConfig({ ENVIRONMENT: 'prod' });

    expect(config.enabled).toBe(false);
    expect(config.message).toContain('DISABLED');
    expect(config.message).toContain('prod');
    expect(config.message).toContain('reported nowhere');
  });

  it('enables on a DSN and reports the environment and release', () => {
    const config = resolveSentryConfig({
      SENTRY_DSN: 'https://k@o1.ingest.sentry.io/2',
      ENVIRONMENT: 'uat',
      COMMIT_SHA: 'abc1234',
    });

    expect(config).toMatchObject({
      enabled: true,
      dsn: 'https://k@o1.ingest.sentry.io/2',
      environment: 'uat',
      release: 'abc1234',
    });
    expect(config.message).toContain('abc1234');
  });

  it('treats whitespace as unset — a blank secret must not look configured', () => {
    // Key Vault secrets and shell interpolation both produce empty-ish values easily. An
    // enabled tracker with a blank DSN would fail at init instead of reporting honestly.
    expect(resolveSentryConfig({ SENTRY_DSN: '   ' }).enabled).toBe(false);
  });

  it('says when there is no release tag rather than pretending', () => {
    const config = resolveSentryConfig({ SENTRY_DSN: 'https://k@o1.ingest.sentry.io/2' });

    expect(config.release).toBeUndefined();
    expect(config.message).toContain('COMMIT_SHA unset');
  });

  it('falls back through ENVIRONMENT, NODE_ENV, then development', () => {
    expect(resolveSentryConfig({ ENVIRONMENT: 'prod', NODE_ENV: 'production' }).environment).toBe(
      'prod',
    );
    expect(resolveSentryConfig({ NODE_ENV: 'production' }).environment).toBe('production');
    expect(resolveSentryConfig({}).environment).toBe('development');
  });

  it('refuses the Terraform placeholder rather than enabling on it', () => {
    // Terraform creates the Key Vault secret but never its value, so an environment where
    // nobody has set the real DSN yet receives this literal string. Enabling on it would mean
    // believing tracking was on while every event silently failed to send.
    const config = resolveSentryConfig({
      SENTRY_DSN: 'placeholder-set-out-of-band',
      ENVIRONMENT: 'uat',
    });

    expect(config.enabled).toBe(false);
    expect(config.message).toContain('not a DSN URL');
    expect(config.message).toContain('Key Vault');
  });

  it('does not read the retired GLITCHTIP_DSN', () => {
    // D8 dropped GlitchTip as the hosted choice. Nothing ever set this name, so honouring it
    // would only preserve a trap for whoever copies an old env file.
    expect(resolveSentryConfig({ GLITCHTIP_DSN: 'https://k@o1.ingest.sentry.io/2' }).enabled).toBe(
      false,
    );
  });
});
