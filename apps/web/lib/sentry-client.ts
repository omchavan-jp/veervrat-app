import * as Sentry from '@sentry/nextjs';
import type { RuntimeConfig } from './runtime-config';

/**
 * Initialises browser error tracking, once, using the DSN the server resolved.
 *
 * There is no earlier hook to call this from. Next.js's own `instrumentation-client.ts`
 * convention runs before any component, which is exactly when this DSN is NOT yet known — it
 * only exists once `RuntimeConfigProvider` has rendered with the value the server put in the
 * page. Every render error caught from that point onward is still captured; only errors in the
 * true bootstrap before React starts are missed, which a build-time-baked config could not avoid
 * either without recreating the whole `NEXT_PUBLIC_*` promotion defect (§17).
 */
let initialised = false;

export function initBrowserSentry(config: RuntimeConfig): void {
  if (typeof window === 'undefined') return; // SSR executes this component's body too
  if (initialised) return;
  if (!config.sentryDsn) return;

  initialised = true;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.environment,
    release: process.env.NEXT_PUBLIC_COMMIT_SHA,
    sendDefaultPii: false,
    // No traces: the Sentry projects have Tracing switched off, matching the api side
    // (instrument.ts) — sending transactions a project discards spends free-tier quota for
    // nothing.
    tracesSampleRate: 0,
  });
}
