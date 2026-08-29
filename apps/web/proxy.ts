import { type NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n-constants';
import type { SessionUser } from '@/lib/session-user';

// Read per request, never at module scope. Middleware modules are bundled, and a
// module-scope `process.env` read can be frozen into that bundle — the same build-time
// baking that pointed prod's web tier at UAT's api (21_Infrastructure-Conventions §17).
//
// `API_INTERNAL_URL` is preferred because this is the one call the *server* makes to the api,
// and both run in the same environment. Sent to the public origin it leaves the network and
// comes back, adding latency to every server-rendered page and making a cold api something the
// proxy waits on — and a proxy that times out reports no user, which the layout reads as
// "signed out". The browser is unaffected: it keeps using the public origin, so nothing about
// cookie scope or CORS changes.
//
// Optional by design. Unset — local development, and any environment that has not defined one —
// it falls back to the public URL and behaves exactly as before.
export function apiBase(): string {
  return (
    process.env.API_INTERNAL_URL || process.env.API_BASE_URL || 'http://localhost:3001/api/v1'
  );
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

  try {
    const res = await fetch(`${apiBase()}/auth/me`, {
      headers: { Cookie: `veervrat_session=${sessionCookie.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: SessionUser };
    return body?.data ?? null;
  } catch {
    // Degrade to anonymous, never to an error page. If the api is unreachable the site should
    // look logged out, not break — and the guards will send the user to /login, which is the
    // truthful outcome.
    return null;
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
