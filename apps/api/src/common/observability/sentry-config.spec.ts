import { describe, it, expect } from 'vitest';
import { resolveSentryConfig, scrubEvent } from './sentry-config';

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

describe('scrubEvent', () => {
  it('redacts an email address carried inside an error message', () => {
    // The realistic leak: nobody attaches an address deliberately, a failure quotes one.
    const event = { message: 'Failed to send to someone@example.com after 3 attempts' };

    const scrubbed = scrubEvent(event);

    expect(scrubbed.message).toContain('[redacted-email]');
    expect(scrubbed.message).not.toContain('someone@example.com');
  });

  it('redacts long opaque strings — session and verification tokens', () => {
    const event = { message: 'invalid token 9f8e7d6c5b4a39281706abcdef1234567890abcd' };

    expect(scrubEvent(event).message).toContain('[redacted-token]');
  });

  it('reaches into nested objects and arrays', () => {
    const event = {
      extra: { attempts: [{ to: 'a@b.com' }, { to: 'c@d.com' }] },
      tags: { env: 'prod' },
    };

    const scrubbed = scrubEvent(event);

    expect(JSON.stringify(scrubbed)).not.toContain('a@b.com');
    expect(JSON.stringify(scrubbed)).not.toContain('c@d.com');
    expect(scrubbed.tags.env).toBe('prod');
  });

  it('keeps the error diagnosable rather than dropping it', () => {
    // A redacted event is still useful; a dropped one is an outage nobody hears about.
    const event = { message: 'Unique constraint failed for user@x.com on users.email' };

    const scrubbed = scrubEvent(event);

    expect(scrubbed.message).toContain('Unique constraint failed');
    expect(scrubbed.message).toContain('users.email');
  });

  it('leaves ordinary short values alone', () => {
    const event = { message: 'ECONNREFUSED 10.0.0.4:5432', tags: { release: 'abc1234' } };

    expect(scrubEvent(event)).toEqual(event);
  });
});
