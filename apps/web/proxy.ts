import { type NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n-constants';

// Read per request, never at module scope. Middleware modules are bundled, and a
// module-scope `process.env` read can be frozen into that bundle — the same build-time
// baking that pointed prod's web tier at UAT's api (21_Infrastructure-Conventions §17).
function apiBase(): string {
  return process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
}

function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return 'en';
  return header.toLowerCase().includes('mr') ? 'mr' : 'en';
}

async function resolveLocale(request: NextRequest): Promise<Locale> {
  const sessionCookie = request.cookies.get('veervrat_session');
  if (!sessionCookie) {
    return parseAcceptLanguage(request.headers.get('accept-language'));
  }

  try {
    const res = await fetch(`${apiBase()}/auth/me`, {
      headers: {
        Cookie: `veervrat_session=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return parseAcceptLanguage(request.headers.get('accept-language'));
    }

    const body = (await res.json()) as { data?: { language?: string } };
    // DB stores 'EN'|'MR' (uppercase); SUPPORTED_LOCALES is lowercase
    const lang = body?.data?.language?.toLowerCase();
    if (lang && (SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
      return lang as Locale;
    }
    return 'en';
  } catch {
    return parseAcceptLanguage(request.headers.get('accept-language'));
  }
}

export async function proxy(request: NextRequest) {
  // Fast path: a NEXT_LOCALE cookie skips the per-request /auth/me round-trip
  // (which added cross-service latency to EVERY page load). The cookie is a cache
  // of the DB preference — the language toggle writes it client-side, and we
  // self-heal it below whenever it's absent.
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const cached = (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale ?? '')
    ? (cookieLocale as Locale)
    : null;

  const locale = cached ?? (await resolveLocale(request));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Next-Locale', locale);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  if (!cached) {
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
