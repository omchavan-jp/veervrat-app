import { type NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n-constants';
import type { SessionUser } from '@/lib/session-user';

// Read per request, never at module scope. Middleware modules are bundled, and a
// module-scope `process.env` read can be frozen into that bundle — the same build-time
// baking that pointed prod's web tier at UAT's api (21_Infrastructure-Conventions §17).

/**
 * The in-environment address of the api, when one is configured.
 *
 * This is the single call the *server* makes to the api, and both run in the same Container Apps
 * environment. Sent to the public origin it leaves the network and comes back: latency on every
 * server-rendered page, and a cold api becomes something the proxy waits on.
 *
 * Returns null when unset, which is the normal state in local development and in any environment
 * that has not been given one.
 */
export function internalApiBase(): string | null {
  return process.env.API_INTERNAL_URL || null;
}

/** What the browser uses, and what the server falls back to. */
export function publicApiBase(): string {
  return process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
}

// How long an in-environment call may take before it is treated as broken. It is a call to a
// neighbour behind the same proxy; if it has not answered in two seconds, waiting longer only
// makes the page slower for no better outcome.
const INTERNAL_TIMEOUT_MS = 2_000;

// After the internal address fails, stop trying it for a minute rather than paying a doomed
// attempt on every request. Short enough that fixing the configuration takes effect without a
// redeploy.
const INTERNAL_COOLDOWN_MS = 60_000;

// Module scope is safe here in a way a `process.env` read is not: this is state that only exists
// at runtime, so there is nothing for a build to freeze. Per process, and forgotten on restart.
let internalUnusableUntil = 0;

function internalIsWorthTrying(): boolean {
  return Date.now() >= internalUnusableUntil;
}

function noteInternalFailure(base: string): void {
  const first = internalUnusableUntil === 0;
  internalUnusableUntil = Date.now() + INTERNAL_COOLDOWN_MS;
  if (first) {
    // Once, not per request. A misconfigured internal address must be visible — silently
    // serving every request over the public path would hide the very thing this exists to fix.
    console.warn(
      `[proxy] API_INTERNAL_URL (${base}) did not answer /auth/me; using the public URL instead.`,
    );
  }
}

function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return 'en';
  return header.toLowerCase().includes('mr') ? 'mr' : 'en';
}

/**
 * Resolve the signed-in user, server-side, from the session cookie.
 *
 * This call already existed — it was made to read ONE field (`language`) and the rest of the
 * user was discarded, only for the browser to fetch the same object again. Keeping it is the
 * substance of this change: the session lives in an HttpOnly cookie the browser cannot read,
 * so the server is the only party that can answer "who is this", and it already asked.
 *
 * Returns null for anonymous visitors WITHOUT calling the api — public pages are the most
 * trafficked and must not gain a round trip.
 */
async function resolveUser(request: NextRequest): Promise<SessionUser | null> {
  const sessionCookie = request.cookies.get('veervrat_session');
  if (!sessionCookie) return null;

  const internal = internalApiBase();
  if (internal && internalIsWorthTrying()) {
    const viaInternal = await askWhoThisIs(internal, sessionCookie.value, INTERNAL_TIMEOUT_MS);
    if (viaInternal.answered) return viaInternal.user;
    noteInternalFailure(internal);
  }

  // The public URL is what every environment had before this, so a wrong or unreachable internal
  // address costs one failed attempt and then behaves exactly as it used to — rather than
  // reporting nobody is signed in, which the layout renders as being signed out.
  const viaPublic = await askWhoThisIs(publicApiBase(), sessionCookie.value);
  return viaPublic.answered ? viaPublic.user : null;
}

/**
 * The distinction the fallback turns on: did the api *answer*, or did we fail to reach it?
 *
 * A 401 is an answer — "nobody is signed in with that cookie" — and must not trigger a retry
 * against the other address. Treating it as a failure would double every request made by
 * somebody whose session had simply expired.
 *
 * Everything else that is not a clean 2xx is treated as not-reached, including redirects.
 * `redirect: 'manual'` is deliberate: the api sets `allowInsecure: false`, so an `http://`
 * request to an in-environment name is answered with a redirect to the public FQDN. Following
 * it would leave the environment silently and defeat the point, while looking like success.
 */
type Answer = { answered: true; user: SessionUser | null } | { answered: false };

async function askWhoThisIs(
  base: string,
  sessionToken: string,
  timeoutMs?: number,
): Promise<Answer> {
  if (!base) return { answered: false };
  try {
    const res = await fetch(`${base}/auth/me`, {
      headers: { Cookie: `veervrat_session=${sessionToken}` },
      cache: 'no-store',
      redirect: 'manual',
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    });
    if (res.status === 401) return { answered: true, user: null };
    if (!res.ok) return { answered: false };
    const body = (await res.json()) as { data?: SessionUser };
    return { answered: true, user: body?.data ?? null };
  } catch {
    // Degrade to anonymous, never to an error page. If the api is unreachable the site should
    // look logged out, not break — and the guards will send the user to /login, which is the
    // truthful outcome.
    return { answered: false };
  }
}

function localeFrom(user: SessionUser | null, request: NextRequest): Locale {
  const lang = user?.language?.toLowerCase();
  if (lang && (SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
    return lang as Locale;
  }
  return parseAcceptLanguage(request.headers.get('accept-language'));
}

export async function proxy(request: NextRequest) {
  // The session is resolved on every document request for signed-in users. That is a deliberate
  // cost, decided in openspec/changes/server-resolved-auth: it is what lets the client render
  // with auth already known, instead of fetching it and gating the whole tree on a spinner.
  //
  // Anonymous visitors cost nothing extra — resolveUser returns null without calling the api —
  // so the busiest pages (login, signup) are unaffected.
  const user = await resolveUser(request);

  // NEXT_LOCALE is still a useful cache, but ONLY for anonymous visitors now. For a signed-in
  // user the language arrives with the user object, so reading a cookie to avoid a call we are
  // making anyway would just be a way to serve a stale language after they changed it.
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const anonCached =
    !user && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale ?? '')
      ? (cookieLocale as Locale)
      : null;

  const locale = user ? localeFrom(user, request) : (anonCached ?? localeFrom(null, request));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Next-Locale', locale);
  // Passed by header rather than re-read downstream, so the lookup happens exactly once per
  // request. Base64 because header values must be latin-1 and display names are not.
  if (user) {
    requestHeaders.set(
      'X-Session-User',
      Buffer.from(JSON.stringify(user), 'utf8').toString('base64'),
    );
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!user && !anonCached) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
