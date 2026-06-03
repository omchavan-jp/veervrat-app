## ADDED Requirements

### Requirement: Middleware resolves locale from user session
The system SHALL intercept all non-static, non-API HTML requests via Next.js middleware. When a `veervrat_session` cookie is present, middleware SHALL call `GET /api/v1/auth/me` with that cookie and extract the `language` field (`'en'` or `'mr'`). The resolved locale SHALL be set as a `X-Next-Locale` request header forwarded to the Next.js rendering pipeline. When no session cookie is present, or when the API call fails, middleware SHALL fall back to the `Accept-Language` request header (matching `'mr'`) or default to `'en'`.

#### Scenario: Authenticated user with MR preference
- **WHEN** a user with `language: 'mr'` makes a request with a valid `veervrat_session` cookie
- **THEN** middleware sets `X-Next-Locale: mr` on the request and the page renders in Marathi

#### Scenario: Unauthenticated guest
- **WHEN** a request arrives with no `veervrat_session` cookie
- **THEN** middleware does NOT call the API and sets `X-Next-Locale: en` (or `mr` if `Accept-Language` matches Marathi)

#### Scenario: API error during locale resolution
- **WHEN** the `/api/v1/auth/me` call throws or returns a non-2xx response
- **THEN** middleware catches the error, logs a warning, and defaults to `X-Next-Locale: en`

#### Scenario: Static asset and API passthrough
- **WHEN** a request targets `/_next/static/`, `/_next/image/`, `favicon.ico`, or `/api/`
- **THEN** middleware does NOT run (excluded by matcher config)

### Requirement: getRequestConfig reads locale from middleware header
`i18n/request.ts` SHALL call `headers()` from `next/headers` and read `X-Next-Locale`. The returned `locale` SHALL be either `'en'` or `'mr'`. Messages SHALL be loaded from `apps/web/messages/{locale}.json`.

#### Scenario: Locale header present
- **WHEN** `X-Next-Locale` header is set to `'mr'`
- **THEN** `getRequestConfig` returns `{ locale: 'mr', messages: <mr.json contents> }`

#### Scenario: Locale header absent (fallback)
- **WHEN** `X-Next-Locale` header is not present
- **THEN** `getRequestConfig` defaults to `locale: 'en'`

### Requirement: All route group layouts provide NextIntlClientProvider
Every route group layout (`(public)`, `(app)`, `(moderation)`, `(admin)`, `(vratmitra)`) SHALL wrap its children with `NextIntlClientProvider` with the messages fetched via `getMessages()`. This ensures client components anywhere in the tree can call `useTranslations()`.

#### Scenario: Client component in (app) route group
- **WHEN** a client component inside `app/(app)/` calls `useTranslations('common')`
- **THEN** it receives translated strings without error

### Requirement: Language toggle component
A `LanguageToggle` component SHALL be available in `components/shared/language-toggle.tsx`. It SHALL display the current locale (`EN` / `MR`) and allow the user to switch. On toggle: it SHALL call `PATCH /api/v1/users/me` with `{ language: '<new_locale>' }`, then call `router.refresh()` to re-render server components with the new locale. The component SHALL be usable in any layout header.

#### Scenario: Switching from EN to MR
- **WHEN** an authenticated user clicks the MR option in the language toggle
- **THEN** the API is called with `{ language: 'mr' }`, `router.refresh()` is called, and the page re-renders in Marathi

#### Scenario: Language toggle for guests
- **WHEN** an unauthenticated user views the language toggle
- **THEN** the component is hidden or disabled (toggling language requires an authenticated account to persist the preference)

### Requirement: Messages files contain auth and common namespaces
`messages/en.json` and `messages/mr.json` SHALL contain at minimum:
- `auth` namespace — all keys for the five auth pages (login, signup, forgotPassword, resetPassword, verifyEmail, errors) — already complete from item 4
- `common` namespace — keys for generic UI: `nav.*` (sidebar labels), `actions.*` (save, cancel, confirm, delete), `status.*` (loading, error, empty)

#### Scenario: Common namespace key used in shared component
- **WHEN** a shared component calls `useTranslations('common')('actions.save')`
- **THEN** it returns `'Save'` in EN and `'जतन करा'` in MR
