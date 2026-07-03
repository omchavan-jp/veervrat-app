export type SameSiteMode = 'lax' | 'strict' | 'none';

/**
 * Cross-site cookie policy for auth/CSRF cookies.
 *
 * When web and api are served from different hosts (our Railway subdomain
 * deploy: web-*.up.railway.app vs api-*.up.railway.app), the browser only sends
 * cookies on web→api requests if they are `SameSite=None; Secure`. Locally
 * (same-site `localhost`) we keep `Lax`.
 *
 * Default: `none` in production, `lax` otherwise. Override with `COOKIE_SAMESITE`
 * — e.g. set it to `lax` once web and api share one parent domain (custom
 * domain), which is both simpler and stricter.
 */
export function cookieSameSite(): SameSiteMode {
  const override = process.env.COOKIE_SAMESITE;
  if (override === 'lax' || override === 'strict' || override === 'none') {
    return override;
  }
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}
