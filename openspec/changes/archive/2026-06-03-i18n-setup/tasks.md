## 1. Middleware — locale detection

- [x] 1.1 Create `apps/web/middleware.ts`: read `veervrat_session` cookie → call `GET /api/v1/auth/me` → extract `language` field → set `X-Next-Locale` request header; fall back to `Accept-Language` (match `'mr'`) or `'en'` on missing session/API error; configure `matcher` to exclude `_next/static`, `_next/image`, `favicon.ico`, `api/`
- [x] 1.2 Update `apps/web/i18n/request.ts`: replace hardcoded `'en'` with `headers().get('X-Next-Locale') ?? 'en'`; validate it's one of `['en', 'mr']` before using

## 2. (app) route group — authenticated layout

- [x] 2.1 Create `apps/web/app/(app)/layout.tsx`: async server component; fetch messages via `getMessages()`; wrap children with `NextIntlClientProvider`; render `<AppLayoutClient>` inside
- [x] 2.2 Create `apps/web/app/(app)/layout-client.tsx`: `'use client'`; use `useAuth()` hook; redirect to `/login` if not authenticated; redirect to `/onboarding` if `onboardingCompletedAt === null`; show spinner while loading; pass children through when authenticated+onboarded
- [x] 2.3 Create `apps/web/app/(app)/dashboard/page.tsx`: minimal server component placeholder — show "Dashboard" heading and current user display name (fetched server-side via `useAuth` query hydration or pass from layout); no real data needed
- [x] 2.4 Remove `apps/web/app/page.tsx` (root home placeholder — now superseded by `(app)/dashboard/`) and `apps/web/app/not-found.tsx` if it references the placeholder

## 3. Language toggle component + users API

- [x] 3.1 Create `apps/web/lib/api/users.ts`: export `usersApi` with `updateMe(data: { language?: string; displayName?: string })` calling `PATCH /api/v1/users/me`
- [x] 3.2 Create `apps/web/components/shared/language-toggle.tsx`: `'use client'`; display current locale from `useLocale()` (next-intl); on toggle call `usersApi.updateMe({ language: newLocale })` then `router.refresh()`; hide/disable when not authenticated (check via `useAuth()`)

## 4. Extend (moderation) and (admin) route group layouts

- [x] 4.1 Create `apps/web/app/(moderation)/layout.tsx`: async server component wrapping `NextIntlClientProvider` with `getMessages()` (same pattern as `(public)` and `(app)` layouts)
- [x] 4.2 Create `apps/web/app/(admin)/layout.tsx`: same pattern
- [x] 4.3 Create `apps/web/app/(vratmitra)/layout.tsx`: same pattern

## 5. Messages — common namespace

- [x] 5.1 Add `common` namespace to `apps/web/messages/en.json`: keys for `nav` (dashboard, journeys, actions, profile, settings, logout, studyFlow, workFlow), `actions` (save, cancel, confirm, delete, edit, submit), `status` (loading, error, empty, retry)
- [x] 5.2 Add `common` namespace to `apps/web/messages/mr.json`: Marathi translations for all keys added in 5.1

## 6. Root layout — dynamic lang attribute

- [x] 6.1 Update `apps/web/app/layout.tsx`: make it async; read `locale` from `getLocale()` (next-intl server) or `headers().get('X-Next-Locale') ?? 'en'`; pass to `<html lang={locale}>`

## 7. Tests

- [x] 7.1 Write unit test for middleware locale resolution: mock `fetch` for `/api/v1/auth/me`; test authenticated MR user sets `X-Next-Locale: mr`; test no-cookie guest defaults to `en`; test API error falls back to `en`
- [x] 7.2 Write component test for `LanguageToggle`: renders current locale; clicking alternate locale calls `usersApi.updateMe` with correct arg and calls `router.refresh()`
