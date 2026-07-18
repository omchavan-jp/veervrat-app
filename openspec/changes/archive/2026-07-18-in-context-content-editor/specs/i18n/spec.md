# i18n — delta spec

## MODIFIED Requirements

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
