// Configuration that differs between deployed environments, resolved when the app RUNS.
//
// It cannot be resolved at build time. CD builds one web image and promotes that same image
// from UAT to production without rebuilding, so anything the bundler inlines — every
// `NEXT_PUBLIC_*`, and anything `next.config.ts` freezes into the build — is identical in both
// environments. That is not theoretical: prod's web tier proxied to UAT's *database* for a day
// because `API_ORIGIN` was baked. See documentation/21_Infrastructure-Conventions.md §17.
//
// The test for whether a value may be baked: **does it describe the image, or the environment
// the image runs in?** `NEXT_PUBLIC_COMMIT_SHA` describes the image and is correctly baked.
// Everything here describes the environment and must not be.

/**
 * Whether the feedback widget exists in this environment, and for whom.
 *
 *   off     — nobody, whatever they have been granted
 *   granted — only holders of the FEEDBACK_WIDGET capability
 *
 * UAT mirrors prod deliberately. An earlier `all` (everyone, grants ignored) was used there so
 * reviewers needed no setup, which meant the grant path was never exercised before prod — the
 * opposite of what UAT is for.
 *
 * Replaces the older `test` / `public` pair, which described *how open* the widget was without
 * being able to express "these specific people".
 */
export type FeedbackMode = 'off' | 'granted';

export type RuntimeConfig = {
  /** Absolute base URL of the api, including the /api/v1 prefix. */
  apiBaseUrl: string;
  /** Absolute origin this app is served from; used for canonical and og: URLs. */
  siteUrl: string;
  feedbackMode: FeedbackMode;
  /**
   * Which deployment this is. Used to show environment-unavailable controls as unavailable
   * rather than merely inert — e.g. content editing, which the API refuses on prod for
   * everyone (O7), so an admin must not be able to toggle a grant that can never take effect.
   */
  environment: 'local' | 'uat' | 'prod';
  /**
   * Whether the in-context content editor exists in this environment.
   *
   * Read by the admin UI so the CONTENT_EDIT toggle is shown as *unavailable* rather than
   * merely inert. Inferring it from `environment` was not enough — the editor can be off on UAT
   * too, and an admin offered a toggle that saves and does nothing is exactly the footgun the
   * unavailable state exists to prevent. It shipped that way once.
   */
  contentEditEnabled: boolean;
  /**
   * The browser Sentry DSN for this environment, or undefined if error tracking is off.
   *
   * Threaded through here rather than read as `NEXT_PUBLIC_SENTRY_DSN`, on purpose: that would
   * be inlined at build time, and one web image is promoted from UAT to prod unchanged (§17) —
   * UAT's DSN would ship to production, or an empty build-time value would ship to both.
   *
   * Not a secret. A browser Sentry SDK always ships its DSN in the page it instruments — it is
   * a write-only ingest address, not a credential that reads anything back — so sending it down
   * with the rest of RuntimeConfig is the same trust boundary this value already crosses.
   */
  sentryDsn: string | undefined;
};

/**
 * The session as resolved by the middleware, seeded so the first client render already knows
 * who is signed in.
 *
 * Kept separate from RuntimeConfig on purpose: RuntimeConfig describes the ENVIRONMENT and is
 * identical for every visitor, whereas this is per-request and per-person. Merging them would
 * invite someone to cache or memoise the pair and leak one user's identity to another.
 */
export type SeededAuth = { user: import('./session-user').SessionUser | null };

function parseEnvironment(raw: string | undefined): 'local' | 'uat' | 'prod' {
  return raw === 'uat' || raw === 'prod' ? raw : 'local';
}

function parseFeedbackMode(raw: string | undefined): FeedbackMode {
  // Unrecognised values fail closed: a typo must not open a gated feature.
  return raw === 'granted' ? 'granted' : 'off';
}

/**
 * `undefined` for both "not set" and "set to something that isn't a DSN".
 *
 * Terraform creates the `sentry-dsn` Key Vault secret with a placeholder value and never sets
 * the real one — the value is set out of band per environment. Until someone does, this
 * environment variable holds that placeholder, and initialising Sentry with it would mean
 * believing tracking is on while every event silently fails to send — the same illusion the
 * api-side `resolveSentryConfig` guards against.
 */
function parseSentryDsn(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

/**
 * Read from the server's environment. Safe only on the server — these are deliberately not
 * `NEXT_PUBLIC_*`, so they are absent in the browser.
 */
export function readServerRuntimeConfig(): RuntimeConfig {
  return {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
    siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    feedbackMode: parseFeedbackMode(process.env.FEEDBACK_MODE),
    environment: parseEnvironment(process.env.ENVIRONMENT),
    contentEditEnabled: process.env.CONTENT_EDIT_ENABLED === 'true',
    sentryDsn: parseSentryDsn(process.env.SENTRY_DSN),
  };
}

// Populated once on the client by RuntimeConfigProvider, from the values the server rendered
// into the HTML. Module-level rather than context-only because `lib/api/client.ts` is called
// from places that are not React components (query functions, event handlers).
let clientConfig: RuntimeConfig | undefined;

export function setClientRuntimeConfig(config: RuntimeConfig): void {
  clientConfig = config;
}

/**
 * Works on both sides: the server reads its environment directly, the browser uses what the
 * provider installed.
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return readServerRuntimeConfig();
  }
  if (!clientConfig) {
    // Reaching here means something called this above RuntimeConfigProvider in the tree.
    // Failing loudly beats silently falling back to localhost, which is how an environment
    // ends up addressing the wrong backend without anyone noticing.
    throw new Error(
      'Runtime config read before RuntimeConfigProvider mounted. Ensure the provider wraps the app in the root layout.',
    );
  }
  return clientConfig;
}
