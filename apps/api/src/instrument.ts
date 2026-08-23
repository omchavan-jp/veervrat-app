import * as Sentry from '@sentry/node';
import { resolveSentryConfig, scrubEvent } from './common/observability/sentry-config';

// Must be imported FIRST in main.ts, before any other module, so the runtime is instrumented
// before anything else loads.
const config = resolveSentryConfig();

if (config.enabled) {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    // Every error, a tenth of the traces. Errors are the point; traces are a sampling problem.
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    // Never ship PII to the error tracker. `sendDefaultPii` covers what the SDK attaches;
    // `beforeSend` covers what an error message carries in its own text, which is the part
    // that actually leaves the country.
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
  });
}

// Printed either way, deliberately — see resolveSentryConfig. `console` rather than the Nest
// logger because this file runs before the application (and therefore the logger) exists.
// eslint-disable-next-line no-console
(config.enabled ? console.log : console.warn)(config.message);
