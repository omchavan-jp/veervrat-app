# i18n Spec

## Purpose
Session-aware locale detection for the Veervrat Next.js frontend. Middleware resolves locale from the authenticated user's stored `language` field (`'en'` or `'mr'`), injects it as a request header, and all layouts provide `NextIntlClientProvider` so every client component can call `useTranslations()`.

No URL-based locale routing (`/mr/dashboard`) — locale is a user preference stored in the DB and applied at the layout level.
## Requirements
### Requirement: Middleware resolves locale from user session
The system SHALL intercept all non-static, non-API HTML requests via Next.js middleware. When a `veervrat_session` cookie is present, middleware SHALL call `GET /api/v1/auth/me` with that cookie and extract the `language` field (`'en'` or `'mr'`). The resolved locale SHALL be set as a `X-Next-Locale` **request** header forwarded to the Next.js rendering pipeline via `NextResponse.next({ request: { headers: requestHeaders } })`. When no session cookie is present, or when the API call fails, middleware SHALL fall back to the `Accept-Language` request header (matching `'mr'`) or default to `'en'`.

#### Scenario: Authenticated user with MR preference
- **WHEN** a user with `language: 'mr'` makes a request with a valid `veervrat_session` cookie
- **THEN** middleware sets `X-Next-Locale: mr` on the forwarded request headers and the page renders in Marathi

#### Scenario: Unauthenticated guest
- **WHEN** a request arrives with no `veervrat_session` cookie
- **THEN** middleware does NOT call the API and sets `X-Next-Locale: en` (or `mr` if `Accept-Language` matches Marathi)

#### Scenario: API error during locale resolution
- **WHEN** the `/api/v1/auth/me` call throws or returns a non-2xx response
- **THEN** middleware catches the error and defaults to `X-Next-Locale: en`

#### Scenario: Static asset and API passthrough
- **WHEN** a request targets `/_next/static/`, `/_next/image/`, `favicon.ico`, or `/api/`
- **THEN** middleware does NOT run (excluded by matcher config)

### Requirement: getRequestConfig reads locale from middleware header
`i18n/request.ts` SHALL call `headers()` from `next/headers` and read `X-Next-Locale`. The
returned `locale` SHALL be either `'en'` or `'mr'` (validated against `SUPPORTED_LOCALES`
from `lib/i18n-constants.ts`). Messages SHALL be loaded from
`apps/web/messages/{locale}.json`. When — and only when — `NEXT_PUBLIC_CONTENT_EDIT` is
`on`, `getRequestConfig` SHALL additionally fetch the current staged content overrides for
the resolved locale and deep-merge them over the baked messages (an override value wins per
key) before returning. When the flag is unset or any other value (the production default),
message loading SHALL be exactly the baked `{locale}.json` with no override fetch and no
behavioural change.

#### Scenario: Locale header present (production, no overrides)
- **WHEN** `X-Next-Locale` header is set to `'mr'` and `NEXT_PUBLIC_CONTENT_EDIT` is unset
- **THEN** `getRequestConfig` returns `{ locale: 'mr', messages: <mr.json contents> }` with no override fetch

#### Scenario: Locale header absent (fallback)
- **WHEN** `X-Next-Locale` header is not present
- **THEN** `getRequestConfig` defaults to `locale: 'en'`

#### Scenario: Overrides merged in content-edit mode
- **WHEN** `NEXT_PUBLIC_CONTENT_EDIT` is `on` and a staged override exists for key `feedback.buttonLabel` in `mr`
- **THEN** the messages returned for `mr` contain the overridden value for `feedback.buttonLabel`, and every other key is unchanged

### Requirement: All route group layouts provide NextIntlClientProvider
Every route group layout (`(public)`, `(app)`, `(moderation)`, `(admin)`, `(vratmitra)`) SHALL wrap its children with `NextIntlClientProvider` with the messages fetched via `getMessages()`. This ensures client components anywhere in the tree can call `useTranslations()`.

#### Scenario: Client component in (app) route group
- **WHEN** a client component inside `app/(app)/` calls `useTranslations('common')`
- **THEN** it receives translated strings without error

### Requirement: Language toggle component
A `LanguageToggle` component SHALL be available in `components/shared/language-toggle.tsx`. It SHALL display the current locale (`EN` / `MR`) and allow the user to switch. On successful toggle: it SHALL call `PATCH /api/v1/users/me` with `{ language: '<new_locale>' }`, then call `router.refresh()` to re-render server components with the new locale. If the API call fails, `router.refresh()` SHALL NOT be called and the locale SHALL remain unchanged. The component SHALL be hidden when the user is not authenticated.

#### Scenario: Switching from EN to MR
- **WHEN** an authenticated user clicks the MR option in the language toggle
- **THEN** the API is called with `{ language: 'mr' }`, `router.refresh()` is called, and the page re-renders in Marathi

#### Scenario: API failure during toggle
- **WHEN** the PATCH call fails
- **THEN** `router.refresh()` is NOT called and the locale stays unchanged

#### Scenario: Language toggle for guests
- **WHEN** an unauthenticated user views the language toggle
- **THEN** the component is hidden (returns null)

### Requirement: Messages files contain auth and common namespaces
`messages/en.json` and `messages/mr.json` SHALL contain at minimum:
- `auth` namespace — all keys for the five auth pages (login, signup, forgotPassword, resetPassword, verifyEmail, errors)
- `common` namespace — keys for generic UI: `nav.*` (sidebar labels), `actions.*` (save, cancel, confirm, delete, edit, submit), `status.*` (loading, error, empty, retry)

#### Scenario: Common namespace key used in shared component
- **WHEN** a shared component calls `useTranslations('common')('actions.save')`
- **THEN** it returns `'Save'` in EN and `'जतन करा'` in MR

### Requirement: Supported locales defined in a single shared constant
`apps/web/lib/i18n-constants.ts` SHALL export `SUPPORTED_LOCALES` and `Locale` type. Both `middleware.ts` and `i18n/request.ts` SHALL import from this file — no independent copies.

#### Scenario: Adding a third locale
- **WHEN** a new locale (e.g. `'hi'`) is added to `SUPPORTED_LOCALES` in `i18n-constants.ts`
- **THEN** both middleware and `getRequestConfig` automatically accept it without any other file changes

## File Structure

```
apps/web/
  middleware.ts                          — locale detection via /auth/me
  lib/i18n-constants.ts                  — SUPPORTED_LOCALES, Locale type
  i18n/request.ts                        — getRequestConfig reading X-Next-Locale
  messages/
    en.json                              — auth + common namespaces
    mr.json                              — auth + common namespaces
  app/
    (public)/layout.tsx                  — NextIntlClientProvider wrapper
    (app)/layout.tsx                     — NextIntlClientProvider wrapper
    (moderation)/layout.tsx              — NextIntlClientProvider wrapper
    (admin)/layout.tsx                   — NextIntlClientProvider wrapper
    (vratmitra)/layout.tsx               — NextIntlClientProvider wrapper
  components/shared/language-toggle.tsx  — EN/MR toggle button pair
```

## References
- `documentation/10_Platform-Engineering-Standard.md` — i18n section (no URL-based routing)
- `openspec/specs/auth/spec.md` — auth i18n/request.ts dynamic locale requirement
