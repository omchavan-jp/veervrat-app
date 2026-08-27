# Tasks: Data Export UI (#217)

## Backend

- [x] 1. Add `export-token.ts` — HMAC-signed tokens with `SESSION_SECRET`, 24h TTL
- [x] 2. Add `export-token.spec.ts` — round-trip, wrong secret, garbage, expired
- [x] 3. Expand `data-export.repository.ts` — add `contentSuggestions`, `follows`, `invitations`, `feedbackItems`
- [x] 4. Update `data-export.service.ts` — add 4 new queries to `exportFor()`
- [x] 5. Update `data-export.service.spec.ts` — mocks + expected keys for new entities
- [x] 6. Add `POST /users/me/data-export/email` endpoint (throttled 3/hour, audited)
- [x] 7. Add `GET /users/data-export/:token` endpoint (public, throttled 10/hour)
- [x] 8. Add `EmailModule` to `UsersModule` imports
- [x] 9. Add `DataExportEmail.tsx` — bilingual React Email template

## Frontend

- [x] 10. Add `apps/web/lib/api/data-export.ts` — `download()` + `emailLink()` API client
- [x] 11. Add `DataExportSection` to `/settings` page — download + email buttons
- [x] 12. Add `/settings/data-export/[token]/page.tsx` — emailed-link landing page
- [x] 13. Add 11 i18n keys to `en.json` and `mr.json`
