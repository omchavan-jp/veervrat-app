import * as Sentry from '@sentry/node';

// Error tracking (GlitchTip — Sentry-compatible). Must be imported FIRST in main.ts,
// before any other module, so Sentry can instrument the runtime. No-ops when
// GLITCHTIP_DSN is unset (local dev / tests), so it's safe to always import.
const dsn = process.env.GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Conservative sampling for a beta; raise once traffic is understood.
    tracesSampleRate: 0.1,
    // Never ship PII to the error tracker.
    sendDefaultPii: false,
  });
}
