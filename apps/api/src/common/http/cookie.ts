export type SameSiteMode = 'lax' | 'strict' | 'none';

/**
 * Cross-site cookie policy for auth/CSRF cookies.
 *
 * Default: `none` in production, `lax` otherwise. Set `COOKIE_SAMESITE=lax` wherever web and
 * api share a registrable domain — simpler and stricter than `none`, which was only ever
 * required while the two tiers were genuinely cross-site.
 */
export function cookieSameSite(): SameSiteMode {
  const override = process.env.COOKIE_SAMESITE;
  if (override === 'lax' || override === 'strict' || override === 'none') {
    return override;
  }
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

/**
 * Domain scope for auth cookies. Unset locally; in deployed environments it must name the
 * domain SHARED by web and api.
 *
 * ⚠️ This is load-bearing and its absence fails in a way that looks like something else.
 *
 * Without it the cookie is host-only to the api (`api.veervrat.example.org`), so it is never
 * sent to the web tier (`veervrat.example.org`). Requests to the api keep working, so the app
 * looks fine — until the WEB tier needs to read the session, which it now does in middleware to
 * resolve auth server-side. There the cookie is simply absent, the user resolves as anonymous,
 * and the guards bounce them to /login immediately after a successful login.
 *
 * That exact bug shipped: login stopped persisting on UAT while passing every local test,
 * because local runs web and api on the same host (`localhost`), where cookies are shared
 * across ports and the missing Domain never matters.
 */
export function cookieDomain(): string | undefined {
  return process.env.COOKIE_DOMAIN || undefined;
}

/**
 * The options every auth cookie must share. Centralised because there are four call sites and
 * a cookie set with a different scope than it is cleared with cannot be cleared at all.
 */
export function authCookieOptions(opts: { httpOnly: boolean; maxAgeMs?: number }) {
  return {
    httpOnly: opts.httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: cookieSameSite(),
    domain: cookieDomain(),
    path: '/',
    ...(opts.maxAgeMs !== undefined ? { maxAge: opts.maxAgeMs } : {}),
  };
}

/**
 * Clear the pre-COOKIE_DOMAIN cookie left in browsers from before the scope changed.
 *
 * Changing a cookie's Domain does not move the old one — it creates a SECOND cookie with the
 * same name at a different scope. Both are then sent to the api, which picks one arbitrarily,
 * so a signed-in user can find themselves half-authenticated: pages render, and actions fail
 * with 401. Observed exactly that on UAT — logout itself returned unauthorised, while a private
 * window worked perfectly because it had no orphan.
 *
 * Omitting `domain` targets the host-only variant specifically, leaving the correctly scoped
 * cookie untouched. Safe to call unconditionally and safe to remove once no browser could still
 * be holding a cookie from before 2026-08-20.
 */
export function clearLegacyHostOnlyCookie(
  res: { clearCookie: (name: string, options?: Record<string, unknown>) => void },
  name: string,
): void {
  if (!cookieDomain()) return; // nothing to disambiguate from
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: cookieSameSite(),
    path: '/',
  });
}
