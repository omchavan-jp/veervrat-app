## Why

The auth pages (from item 4) hardcode `locale = 'en'` in `i18n/request.ts` and have no middleware for locale detection. To respect each user's language preference (EN/MR stored in the user record), the app needs middleware that reads the session cookie, resolves the locale from the user's stored `language` field, and makes it available to all layouts and server components via `getRequestConfig`.

## What Changes

- `apps/web/middleware.ts` — new file: intercepts all non-static requests, reads `veervrat_session` cookie, calls the API to resolve locale from the user's `language` field; sets `X-Locale` response header consumed by `getRequestConfig`
- `apps/web/i18n/request.ts` — replace hardcoded `'en'` with locale resolved from the middleware-set header (falls back to `'en'`)
- `apps/web/app/layout.tsx` — pass resolved locale to `<html lang>` attribute dynamically
- `apps/web/app/(public)/layout.tsx` — already wraps with `NextIntlClientProvider`; ensure `(app)` and other route groups also get it
- `apps/web/app/(app)/layout.tsx` — new: server layout for authenticated pages, wraps with `NextIntlClientProvider` + auth redirect guard
- `apps/web/app/(app)/layout-client.tsx` — new: client component handling the `/login` redirect when unauthenticated or `/onboarding` redirect when `onboardingCompletedAt === null`
- `apps/web/app/(app)/dashboard/page.tsx` — new: minimal dashboard placeholder (needed to have a landing page for authenticated users)
- `apps/web/components/shared/language-toggle.tsx` — new: EN/MR toggle that calls `PATCH /api/v1/users/me` to update `language`, then refreshes the page so middleware re-resolves locale
- `apps/web/messages/en.json` + `mr.json` — extend with `common` namespace keys (nav labels, generic actions) needed by shared UI; auth namespace already complete from item 4

## Capabilities

### New Capabilities
- `i18n`: Session-aware locale detection via Next.js middleware; `getRequestConfig` consuming the resolved locale; `NextIntlClientProvider` in all route group layouts; language toggle component; messages file structure with `auth` + `common` namespaces

### Modified Capabilities
- `auth`: `i18n/request.ts` now resolves locale from middleware header instead of hardcoded `'en'` — requirement change: locale must be dynamic

## Impact

- **Files added**: `middleware.ts`, `app/(app)/layout.tsx`, `app/(app)/layout-client.tsx`, `app/(app)/dashboard/page.tsx`, `components/shared/language-toggle.tsx`
- **Files modified**: `i18n/request.ts`, `app/layout.tsx`, `app/(public)/layout.tsx` (minor — already correct)
- **API dependency**: `GET /api/v1/auth/me` — middleware calls this with the session cookie to resolve locale; no new API endpoint needed
- **No new npm dependencies** — `next-intl` is already installed (`next.config.ts` already wraps with `createNextIntlPlugin`)
