## Context

`next-intl` is already bootstrapped: `createNextIntlPlugin` wraps `next.config.ts`, `i18n/request.ts` exists, and `NextIntlClientProvider` is wired into the `(public)` layout. However locale is hardcoded to `'en'` and no middleware exists for session-aware detection. The `(app)` route group (authenticated pages) has no layout file at all — the dashboard placeholder that was committed in item 4 lives at the root without a group. Items 5+ need this foundation before any authenticated screens can carry user-specific locale.

## Goals / Non-Goals

**Goals:**
- Middleware reads `veervrat_session` cookie → calls `GET /api/v1/auth/me` → extracts `language` field → sets `X-Next-Locale` request header consumed by `getRequestConfig`
- Guests (no session or API error) fall back to `Accept-Language` header → default `'en'` if not `'mr'`
- `getRequestConfig` reads `X-Next-Locale` from `headers()` — single source of truth for locale
- `(app)` route group created with server layout (NextIntlClientProvider + messages) and client guard (redirect to `/login` or `/onboarding`)
- Language toggle component: calls `PATCH /api/v1/users/me` with new language, then does `router.refresh()` so middleware re-runs and the page re-renders in the new locale
- `messages/en.json` and `mr.json` extended with a `common` namespace (nav, generic action labels)

**Non-Goals:**
- URL-based locale routing (`/mr/dashboard`) — explicitly not used per Platform-Engineering-Standard
- Auto-detection beyond session + Accept-Language (no IP geo, no cookie-based preference outside the user record)
- Full translation coverage of all future screens — only `auth` (done) + `common` namespace added here; each feature adds its own namespace keys
- Formal i18n for server-rendered API error messages

## Decisions

**Decision 1: Middleware calls `/api/v1/auth/me` for locale resolution**

Alternatives considered:
- Parse the session token in middleware and look up the DB directly — rejected: middleware runs on the Edge runtime (no Prisma, no Node.js APIs)
- Store locale in a separate non-HttpOnly cookie set by the API — rejected: adds a second source of truth; if the user changes language in settings the cookie would drift
- Parse a lightweight JWT with locale embedded — rejected: sessions are opaque tokens stored in PostgreSQL, not JWTs

Chosen: call the API from middleware with the forwarded session cookie. The API is a loopback call (same host in production, localhost in dev). Acceptable latency — the call is ~1ms on the same machine and the result sets a header used for the entire render. Middleware response is not cached (locale changes must reflect immediately).

**Decision 2: `X-Next-Locale` request header as the handoff**

`getRequestConfig` runs as a server async function and has access to `headers()` from `next/headers`. Setting a custom request header in middleware and reading it in `getRequestConfig` is the idiomatic next-intl pattern for dynamic locale. Alternative (passing locale as a search param) would pollute URLs and break SSR caching.

**Decision 3: Middleware matcher excludes static assets and API routes**

`matcher` set to `['/((?!_next/static|_next/image|favicon.ico|api/).*)']` — API routes go directly to NestJS (proxied), static assets need no locale, only HTML document requests need locale resolution.

**Decision 4: Language toggle calls PATCH then `router.refresh()`**

`router.refresh()` (Next.js App Router) re-fetches all server components in the current route without a full page reload. Middleware re-runs, calls `/api/v1/auth/me` with the updated user record, sets the new locale, and `getRequestConfig` loads the new message file. Alternative (full `window.location.reload()`) works but is harsher UX.

**Decision 5: `(app)` layout structure mirrors `(public)` split**

Server layout (`layout.tsx`) fetches messages + wraps `NextIntlClientProvider`. Client layout (`layout-client.tsx`) handles auth redirects (`useAuth` hook). Keeps the server/client boundary clean — server layout never imports hooks, client layout never calls `getMessages()`.

## Risks / Trade-offs

- **Middleware API call on every request**: Each HTML request triggers a loopback call to `/api/v1/auth/me`. For unauthenticated users (no cookie) the middleware short-circuits immediately (no API call). For authenticated users it adds ~1ms. Acceptable at v1 scale. Mitigation: if this becomes a bottleneck, cache the locale in a short-lived cookie (`locale=en; Max-Age=300; HttpOnly`) as a second-pass optimization — not implemented now.

- **API must be running for locale to resolve**: If the NestJS API is down, middleware catches the error and falls back to `'en'`. The app remains functional but loses locale accuracy.

- **`(app)` route group is a new structural addition**: The dashboard placeholder page currently at `app/page.tsx` or similar needs to be moved under `(app)/dashboard/page.tsx`. This is a one-time file move.

## Open Questions

None — all decisions above are resolved by the Platform-Engineering-Standard i18n section and the constraints of the Next.js Edge runtime.
