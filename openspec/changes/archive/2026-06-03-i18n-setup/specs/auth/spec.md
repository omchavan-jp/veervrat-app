## MODIFIED Requirements

### Requirement: i18n/request.ts resolves locale dynamically
`i18n/request.ts` SHALL resolve the locale dynamically from the `X-Next-Locale` request header (set by Next.js middleware) rather than hardcoding `'en'`. The locale SHALL be one of `['en', 'mr']`. If the header is absent or contains an unrecognised value, it SHALL default to `'en'`. Messages SHALL be loaded from `apps/web/messages/{locale}.json`.

#### Scenario: Dynamic locale from middleware header
- **WHEN** middleware has set `X-Next-Locale: mr` for the current request
- **THEN** `getRequestConfig` returns `{ locale: 'mr', messages: <mr.json> }`

#### Scenario: Fallback when header absent
- **WHEN** `X-Next-Locale` header is not present in the request
- **THEN** `getRequestConfig` returns `{ locale: 'en', messages: <en.json> }`
