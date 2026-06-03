## Context

Auth module has sessions, login/register, Google OAuth, password reset, and email verification infrastructure. Missing security hardening (CSRF, throttling, lockout) and email delivery. The frontend auth pages exist but were scaffolded with minimal fields and no i18n.

The app uses cookie-based sessions (not JWTs). CSRF must be the double-submit cookie pattern (per `doc/Auth Architecture Decision - v1.md §15`). Redis is already in the stack. Rate limiting is `@nestjs/throttler` (approved library). Email is Resend with React Email templates (approved).

## Goals / Non-Goals

**Goals:**
- CSRF guard covering all POST/PATCH/DELETE routes, CSRF cookie set on every response
- Throttler with per-route limits matching `Platform-Engineering-Standard.md` table
- Account lockout: Redis-backed, 10 failed logins / 1 hour → 15-minute lock
- EmailModule: Resend in prod, console log in dev; verify-email + password-reset templates
- Fix `completeOnboarding` to accept username + displayName + language
- Frontend auth pages with next-intl strings, signup with full field set and username live-check

**Non-Goals:**
- Two-factor authentication (deferred per spec/26)
- Session management UI (deferred per spec/26)
- Additional OAuth providers
- Per-VM chat email settings (future item)
- All notification email templates (wired in later items)

## Decisions

### 1. CSRF: middleware sets cookie, guard validates header

The double-submit cookie approach: `CsrfMiddleware` runs on every response and sets `csrf-token` (non-HttpOnly, SameSite=Lax, Secure in prod) if not already present. `CsrfGuard` reads the cookie and the `X-CSRF-Token` header and rejects if they don't match.

Applied as a global guard in `AppModule`, **after** `SessionGuard`. Public GET routes (login, register, health) never mutate state so the CSRF guard is only invoked on state-changing HTTP methods (POST, PATCH, DELETE, PUT). Implementation: guard checks `request.method` and skips for GET/HEAD/OPTIONS.

Alternative considered: synchronizer token pattern (server-side per-session token store). Rejected — requires Redis reads on every request. Double-submit is stateless on the server side.

The OAuth callback is a GET redirect — CSRF not applicable. WebSocket handshake — CSRF not applicable (spec §15 explicitly notes this).

### 2. Rate limiting: @nestjs/throttler with per-route `@Throttle()` overrides

Global default: 300 req/min per user (or IP for unauthenticated). Per-route overrides via `@Throttle()` decorator:
- `POST /auth/login` → 10 req / 15 min
- `POST /auth/register` → 5 req / 1 hour  
- `POST /auth/forgot-password` → 5 req / 1 hour
- `POST /uploads/*` → 20 req / hour (wired when upload module is built)
- `POST /search/*` → 60 req / min

`ThrottlerGuard` is added to global guards in `AppModule`. The `@SkipThrottle()` decorator is used on health check and other internal routes.

Alternative: Nginx-level rate limiting. Rejected — not in v1 infrastructure and adds ops complexity. Application-level is sufficient for v1.

### 3. Account lockout: Redis hash, no Prisma writes

On each failed login for a known email: `HINCRBY lockout:{email} failures 1` and `EXPIRE lockout:{email} 3600`. If failures ≥ 10, also set `locked_until` to `now + 900s`. On login attempt: check `locked_until` first; if in future, return `AccountLockedException` with seconds remaining.

Using Redis (not DB) because: lock is ephemeral (auto-expires), DB write on every failed login adds latency, Redis is already in stack. No Prisma writes needed.

`ioredis` is the Redis client (approved pattern per Platform-Engineering-Standard; BullMQ upgrade path uses it). Injected as a custom provider `REDIS_CLIENT` in AppModule.

### 4. EmailModule: conditional Resend vs console

`EmailService` checks `NODE_ENV === 'production'` and `RESEND_API_KEY`. In production with key: uses Resend SDK. In dev or missing key: logs to console with a clear `[EMAIL DEV]` prefix showing recipient, subject, and rendered text.

Templates: React Email components in `apps/api/src/modules/email/templates/`. For v1 (this item): `VerifyEmailEmail.tsx` and `PasswordResetEmail.tsx`. Bilingual — accepts `language: 'EN' | 'MR'` prop, renders appropriate text.

`EmailModule` is global, `EmailService` is injected into `AuthService` replacing the current `this.logger.log(...)` console hacks for verification/reset tokens.

### 5. completeOnboarding: expand DTO + service + repository

`CompleteOnboardingDto` adds:
- `displayName: string` (optional, max 255)
- `username: string` (optional, 3-30 chars, `/^[a-z0-9_]+$/`)
- `language: 'EN' | 'MR'` (optional)

`markOnboardingComplete` repository method updated to also set `username` and `language` if provided. Username uniqueness must be validated before write (DB constraint will catch it but we validate explicitly first via `findUserByUsername`).

### 6. Frontend: next-intl strings in auth pages

Auth pages are already client components. `useTranslations('auth')` hook used for all labels, error messages, and button text. `messages/en.json` and `messages/mr.json` get an `auth` namespace.

The signup page adds: `displayName` field, `username` field with debounced live-check (calls `GET /api/v1/auth/check-username?username=X`), language radio (EN/MR). The live-check endpoint is added to AuthController — no auth required, returns `{ available: boolean }`.

The register page currently routes to `/register` — the spec shows `/signup`. The route group folder stays `(public)/register/` since that is the current scaffolding; the spec path `/signup` will be handled via a redirect or can be renamed in this item. Decision: rename folder to `signup` to match spec.

## Risks / Trade-offs

- [Redis unavailability] Account lockout and OG cache both depend on Redis. If Redis is down, lockout checks fail open (login proceeds). → Mitigation: wrap Redis calls in try/catch, log warn, fail open for lockout (security degrades gracefully rather than blocking all logins).
- [Resend API key missing in prod] Without the key, emails silently go to console. → Mitigation: startup validation warns if `NODE_ENV === 'production'` and `RESEND_API_KEY` is absent.
- [CSRF cookie timing] On first page load before any session, the CSRF cookie is set by the middleware. The frontend must read it before the first state-changing request. → Mitigation: cookie is set on all responses including GETs, so by the time a form submits the cookie is present.
- [Username uniqueness race] Two concurrent signups with same username — DB unique constraint is the final guard. Service-layer check reduces probability but doesn't eliminate it. → Acceptable: duplicate key exception is caught and translated to a 409 response.
