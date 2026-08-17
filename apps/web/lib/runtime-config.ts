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

export type FeedbackMode = 'off' | 'test' | 'public';

export type RuntimeConfig = {
  /** Absolute base URL of the api, including the /api/v1 prefix. */
  apiBaseUrl: string;
  /** Absolute origin this app is served from; used for canonical and og: URLs. */
  siteUrl: string;
  feedbackMode: FeedbackMode;
};

function parseFeedbackMode(raw: string | undefined): FeedbackMode {
  return raw === 'test' || raw === 'public' ? raw : 'off';
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
