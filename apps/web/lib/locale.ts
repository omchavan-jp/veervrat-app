// NEXT_LOCALE is the middleware's fast-path locale cache (see proxy.ts) — it skips
// the per-request /auth/me lookup. Every place that changes the language preference
// must also write this cookie, or the UI language will lag the saved preference.
export function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale.toLowerCase()}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
