import { describe, it, expect, vi, beforeEach } from 'vitest';

const init = vi.fn();
vi.mock('@sentry/nextjs', () => ({ init }));

const baseConfig = {
  apiBaseUrl: 'http://localhost:3001/api/v1',
  siteUrl: 'http://localhost:3000',
  feedbackMode: 'off' as const,
  environment: 'uat' as const,
  contentEditEnabled: false,
};

describe('initBrowserSentry', () => {
  beforeEach(() => {
    init.mockReset();
    vi.resetModules();
  });

  it('does not initialise when there is no DSN', async () => {
    const { initBrowserSentry } = await import('@/lib/sentry-client');
    initBrowserSentry({ ...baseConfig, sentryDsn: undefined });
    expect(init).not.toHaveBeenCalled();
  });

  it('initialises once with the DSN and environment', async () => {
    const { initBrowserSentry } = await import('@/lib/sentry-client');
    initBrowserSentry({ ...baseConfig, sentryDsn: 'https://k@o1.ingest.de.sentry.io/2' });

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://k@o1.ingest.de.sentry.io/2',
        environment: 'uat',
        sendDefaultPii: false,
      }),
    );
  });

  it('never initialises twice, even across repeated renders with a DSN', async () => {
    // RuntimeConfigProvider calls this on every render, not just the first — re-initialising
    // Sentry per render would be wasteful at best and reset its internal state at worst.
    const { initBrowserSentry } = await import('@/lib/sentry-client');
    const config = { ...baseConfig, sentryDsn: 'https://k@o1.ingest.de.sentry.io/2' };

    initBrowserSentry(config);
    initBrowserSentry(config);
    initBrowserSentry(config);

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('sends no traces — the Sentry projects have Tracing switched off', async () => {
    const { initBrowserSentry } = await import('@/lib/sentry-client');
    initBrowserSentry({ ...baseConfig, sentryDsn: 'https://k@o1.ingest.de.sentry.io/2' });

    expect(init).toHaveBeenCalledWith(expect.objectContaining({ tracesSampleRate: 0 }));
  });
});
