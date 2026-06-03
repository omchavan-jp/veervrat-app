## Why

The auth module has basic login/register/session infrastructure but is missing critical security hardening (CSRF, rate limiting, account lockout) and production-required email delivery. The onboarding endpoint is also incomplete — it only accepts `displayName` but the spec requires `username` and `language` as well. Frontend auth pages exist but were scaffolded without `next-intl` strings or the full field set from the screen spec (signup is missing username live-check, language preference).

## What Changes

- **New:** `CsrfMiddleware` — sets `csrf-token` non-HttpOnly cookie on every response; `CsrfGuard` — validates `X-CSRF-Token` header matches cookie on all POST/PATCH/DELETE routes
- **New:** `@nestjs/throttler` applied globally with per-route overrides matching the rate limits in `Platform-Engineering-Standard.md`
- **New:** Account lockout — 10 failed logins within 1 hour → 15-minute Redis lock; user informed with countdown message
- **New:** `EmailModule` — `EmailService` wrapping Resend SDK; console fallback in dev; bilingual templates for verify-email, password-reset
- **Modified:** `completeOnboarding` endpoint — DTO expanded to accept `username`, `displayName`, `language`; service and repository updated accordingly
- **Modified:** Frontend auth pages — all 5 pages (`login`, `signup`, `forgot-password`, `reset-password`, `verify-email`) rebuilt with `next-intl` strings; `signup` adds username (live uniqueness check), language radio, display name; all fields match `spec/decisions/27_screen-specs.md`
- **New deps (backend):** `@nestjs/throttler`, `ioredis`, `resend`, `@react-email/components`
- **New deps (frontend):** `next-intl` (already approved, not yet wired into auth pages)

## Capabilities

### New Capabilities
- `csrf-protection`: Double-submit cookie CSRF guard applied to all state-changing backend routes
- `rate-limiting`: Per-route throttling via @nestjs/throttler matching Platform Engineering Standard limits
- `account-lockout`: Redis-backed failed-login counter; 10 attempts/1h triggers 15-minute lockout
- `email-module`: EmailService with Resend production / console-log dev abstraction; verify-email and password-reset templates

### Modified Capabilities
- `auth`: completeOnboarding now accepts username + displayName + language; login path checks lockout before credential validation

## Impact

- `apps/api/src/modules/auth/` — controller, service, repository, DTOs, new guards/middleware
- `apps/api/src/modules/email/` — new module (email.module.ts, email.service.ts, templates/)
- `apps/api/src/app.module.ts` — wire ThrottlerModule, EmailModule, Redis provider
- `apps/api/src/common/guards/csrf.guard.ts` — new CSRF guard
- `apps/api/src/common/middleware/csrf.middleware.ts` — new CSRF cookie-set middleware
- `apps/web/app/(public)/` — all 5 auth page files replaced
- `apps/web/messages/en.json` and `mr.json` — auth namespace keys added
- `apps/api/package.json` — add @nestjs/throttler, ioredis, resend, @react-email/components
- `documentation/Platform-Engineering-Standard.md` — already lists resend and react-email; add ioredis
