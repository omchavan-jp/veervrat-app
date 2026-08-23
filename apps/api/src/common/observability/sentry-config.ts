/**
 * Decides whether error tracking is on, and says so out loud either way.
 *
 * The old version read `GLITCHTIP_DSN`, initialised Sentry only when it was set, and said
 * nothing when it was not. No environment ever set it — not Terraform, not either deployed app —
 * so `Sentry.init` never ran and every `captureException` in the global exception filter was a
 * no-op. Every 5xx in production went nowhere, while `91_Production-Readiness-Audit.md` recorded
 * error tracking as DONE.
 *
 * That is the same failure this codebase keeps meeting: a control that is installed, looks
 * configured, and does nothing, with silence standing in for health. So this returns a line to
 * print in **both** cases. "Error tracking DISABLED" in a production log is a fact someone can
 * notice; nothing at all is not.
 *
 * `SENTRY_DSN`, not `GLITCHTIP_DSN` (D8). The rename is safe precisely because nothing set the
 * old name anywhere — there is no value to migrate.
 *
 * The DSN is a Sentry-*protocol* endpoint, which is the portability argument: GlitchTip speaks
 * the same protocol, so moving from hosted Sentry to something self-hosted is a change to this
 * one variable, not a change of code.
 */
export type SentryConfig = {
  enabled: boolean;
  dsn?: string;
  environment: string;
  release?: string;
  message: string;
};

export function resolveSentryConfig(env: NodeJS.ProcessEnv = process.env): SentryConfig {
  const dsn = env.SENTRY_DSN?.trim();
  const environment = env.ENVIRONMENT?.trim() || env.NODE_ENV?.trim() || 'development';
  // The image tag is the commit SHA, so a release maps 1:1 to a deployed image with no extra
  // bookkeeping (18_Observability-Standard).
  const release = env.COMMIT_SHA?.trim() || undefined;

  if (!dsn) {
    return {
      enabled: false,
      environment,
      release,
      message:
        `Error tracking DISABLED — SENTRY_DSN is not set. Unhandled server errors in ` +
        `"${environment}" will be logged locally and reported nowhere.`,
    };
  }

  // Terraform creates the Key Vault secret but never its value — the real DSN is set out of
  // band, so until someone does, the app receives the literal placeholder. Enabling on that
  // would mean believing error tracking was on while every event failed to send, which is the
  // precise illusion this module exists to prevent. A real DSN is a URL; nothing else is.
  if (!/^https?:\/\//i.test(dsn)) {
    return {
      enabled: false,
      environment,
      release,
      message:
        `Error tracking DISABLED — SENTRY_DSN is set but is not a DSN URL ` +
        `(got ${JSON.stringify(dsn.slice(0, 24))}). Set the real value in this environment's ` +
        `Key Vault; errors in "${environment}" are reported nowhere until then.`,
    };
  }

  return {
    enabled: true,
    dsn,
    environment,
    release,
    message:
      `Error tracking enabled for "${environment}"` +
      (release ? ` at release ${release}.` : ' (no release tag — COMMIT_SHA unset).'),
  };
}
