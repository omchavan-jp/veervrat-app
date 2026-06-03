## 1. Dependencies and Platform-Engineering-Standard Update

- [x] 1.1 Add `@nestjs/throttler`, `ioredis`, `@types/ioredis`, `resend`, `@react-email/components` to `apps/api/package.json` and run `pnpm install`
- [x] 1.2 Update `documentation/Platform-Engineering-Standard.md` approved library catalog to add `ioredis` (Redis client) entry

## 2. Redis Provider

- [x] 2.1 Create `apps/api/src/common/redis/redis.provider.ts` — exports `REDIS_CLIENT` token and `RedisProvider` using `ioredis` connected to `REDIS_URL` env var (defaults to `redis://localhost:6379`)
- [x] 2.2 Add `REDIS_URL` to `apps/api/.env.example`
- [x] 2.3 Register `RedisProvider` in `AppModule` providers array

## 3. CSRF Middleware and Guard

- [x] 3.1 Create `apps/api/src/common/middleware/csrf.middleware.ts` — sets `csrf-token` cookie (non-HttpOnly, SameSite=Lax, Secure in prod) if not already present on the response
- [x] 3.2 Create `apps/api/src/common/guards/csrf.guard.ts` — for POST/PATCH/DELETE/PUT, validates `X-CSRF-Token` header matches `csrf-token` cookie; returns 403 with `CSRF_INVALID` if mismatch; skips GET/HEAD/OPTIONS
- [x] 3.3 Register `CsrfMiddleware` in `AppModule.configure()` for all routes (`*`)
- [x] 3.4 Register `CsrfGuard` as a global guard in `AppModule` (after `ThrottlerGuard`)
- [x] 3.5 Write unit tests: `csrf.guard.spec.ts` — valid token passes, missing header 403, mismatched token 403, GET exempt

## 4. Rate Limiting

- [x] 4.1 Add `ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 300 }])` to `AppModule` imports
- [x] 4.2 Add `ThrottlerGuard` to global guards in `AppModule`
- [x] 4.3 Apply `@Throttle({ default: { ttl: 900000, limit: 10 } })` to `POST /auth/login` in `AuthController`
- [x] 4.4 Apply `@Throttle({ default: { ttl: 3600000, limit: 5 } })` to `POST /auth/register` in `AuthController`
- [x] 4.5 Apply `@Throttle({ default: { ttl: 3600000, limit: 5 } })` to `POST /auth/forgot-password` in `AuthController`
- [x] 4.6 Apply `@SkipThrottle()` to `AppController` (health check)
- [x] 4.7 Write integration test: login endpoint returns 429 after exceeding limit (use `ThrottlerStorageService` reset between tests)

## 5. Account Lockout

- [x] 5.1 Add `checkLockout(email: string): Promise<{ locked: boolean; secondsRemaining: number }>` to `AuthService` — reads `lockout:{email}` from Redis; returns locked state and TTL
- [x] 5.2 Add `recordFailedLogin(email: string): Promise<void>` to `AuthService` — increments `HINCRBY lockout:{email} failures 1`, sets `EXPIRE 3600`; if failures ≥ 10, also sets `locked_until` with `EXPIREAT` 900s from now
- [x] 5.3 Add `clearLockout(email: string): Promise<void>` to `AuthService` — deletes `lockout:{email}` key
- [x] 5.4 Update `AuthService.login()` — call `checkLockout` before credential validation; throw `AccountLockedException` (new exception) with seconds remaining if locked; call `recordFailedLogin` on credential failure; call `clearLockout` on successful login
- [x] 5.5 Create `AccountLockedException` in `apps/api/src/common/exceptions/app.exceptions.ts` — 429 status, error code `ACCOUNT_LOCKED`, message includes seconds remaining
- [x] 5.6 Wrap Redis calls in lockout methods with try/catch — log warn on Redis error, fail open (allow login to proceed)
- [x] 5.7 Write unit tests: `auth.service.spec.ts` — lockout triggered at 10 failures, cleared on success, fails open when Redis throws

## 6. EmailModule

- [x] 6.1 Create `apps/api/src/modules/email/email.module.ts` — global module exporting `EmailService`
- [x] 6.2 Create `apps/api/src/modules/email/email.service.ts` — `sendTransactional(to, subject, html, text)` and `sendNotification(to, subject, html, text)`; Resend in prod, console log in dev
- [x] 6.3 Create `apps/api/src/modules/email/templates/VerifyEmailEmail.tsx` — React Email component accepting `{ displayName, verifyUrl, language: 'EN' | 'MR' }`; bilingual subject and body
- [x] 6.4 Create `apps/api/src/modules/email/templates/PasswordResetEmail.tsx` — React Email component accepting `{ displayName, resetUrl, language: 'EN' | 'MR' }`; bilingual subject and body
- [x] 6.5 Add a `renderEmail(component)` helper in `email.service.ts` using `@react-email/components` `render()` function to produce HTML + plain text
- [x] 6.6 Register `EmailModule` in `AppModule` imports
- [x] 6.7 Inject `EmailService` into `AuthService`; replace `this.logger.log('[EMAIL VERIFICATION]...')` stub with `EmailService.sendTransactional()` call using `VerifyEmailEmail` template
- [x] 6.8 Replace `this.logger.log('[PASSWORD RESET]...')` stub in `AuthService.forgotPassword()` with `EmailService.sendTransactional()` call using `PasswordResetEmail` template
- [x] 6.9 Add `RESEND_API_KEY` and `EMAIL_FROM` to `apps/api/.env.example`
- [x] 6.10 Write unit tests: `email.service.spec.ts` — dev mode logs to console (no Resend call), prod mode calls Resend SDK

## 7. Fix completeOnboarding Endpoint

- [x] 7.1 Update `CompleteOnboardingDto` — add optional `displayName: string`, optional `username: string` (validated: 3-30 chars, `/^[a-z0-9_]+$/`), optional `language: 'EN' | 'MR'` (IsIn enum)
- [x] 7.2 Add `findUserByUsername(username: string)` to `AuthRepository`
- [x] 7.3 Update `AuthRepository.markOnboardingComplete()` to also accept and persist `username` and `language` fields
- [x] 7.4 Update `AuthService.completeOnboarding()` — if `username` provided, call `findUserByUsername` and throw `DuplicateEntityException` if taken; pass all three fields to repository
- [x] 7.5 Update `AuthController.completeOnboarding()` to pass `dto.username`, `dto.displayName`, `dto.language` to service
- [x] 7.6 Add `GET /api/v1/auth/check-username?username=<value>` endpoint to `AuthController` — calls `AuthRepository.findUserByUsername`; returns `{ data: { available: boolean } }`; no auth required
- [x] 7.7 Write unit tests for the expanded `completeOnboarding` — duplicate username rejected, all fields updated, partial update works

## 8. Frontend — Message Files

- [x] 8.1 Add `auth` namespace to `apps/web/messages/en.json` with all keys for: login (email, password, forgotPassword, submit, googleCta, noAccount), signup (displayName, username, usernameChecking, usernameAvailable, usernameTaken, email, password, passwordHint, languageLabel, en, mr, submit, googleCta, hasAccount, passwordWeak, passwordOk, passwordStrong), forgotPassword (emailLabel, submit, successTitle, successDescription, backToLogin), resetPassword (newPasswordLabel, confirmPasswordLabel, submit, successTitle, successBody, expiredTitle, expiredBody), verifyEmail (verifyingTitle, successTitle, successDescription, invalidLink, failedTitle, backToLogin), errors (invalidCredentials, oauthConflict, authError, rateLimitExceeded, accountLocked)
- [x] 8.2 Add matching `auth` namespace to `apps/web/messages/mr.json` with Marathi translations for all keys

## 9. Frontend — Auth Pages Rebuild

- [x] 9.1 Rename `apps/web/app/(public)/register/` folder to `apps/web/app/(public)/signup/` to match spec path `/signup`; update any internal links to `/register` → `/signup`
- [x] 9.2 Rebuild `apps/web/app/(public)/login/page.tsx` — use `useTranslations('auth')`; all labels from message keys; no hardcoded strings; structure unchanged but fully i18n
- [x] 9.3 Rebuild `apps/web/app/(public)/signup/page.tsx` — add `displayName` field (top of form), `username` field with debounced live check (400ms) via `GET /api/v1/auth/check-username`, language radio (EN/MR), password strength meter; all labels from `auth` namespace; submit sends `{ displayName, username, email, password, language }`
- [x] 9.4 Update `RegisterDto` on the backend to accept `language: 'EN' | 'MR'` (optional, defaults to 'EN') — store it on the user at registration time
- [x] 9.5 Update `AuthRepository.createUserWithEmailAccount()` and `createUserWithOAuthAccount()` to persist the `language` field
- [x] 9.6 Rebuild `apps/web/app/(public)/forgot-password/page.tsx` — use `useTranslations('auth')`; no hardcoded strings
- [x] 9.7 Rebuild `apps/web/app/(public)/reset-password/page.tsx` — use `useTranslations('auth')`; no hardcoded strings
- [x] 9.8 Rebuild `apps/web/app/(public)/verify-email/page.tsx` — use `useTranslations('auth')`; no hardcoded strings
- [x] 9.9 Update `apps/web/lib/api/auth.ts` to add `checkUsername(username: string): Promise<{ available: boolean }>` function
- [x] 9.10 Update Zod signup schema in `apps/web/lib/validations/auth.ts` to include `displayName`, `username`, `language` fields

## 10. Tests

- [x] 10.1 Write API integration test: `POST /auth/login` rate limit — 11th request returns 429
- [x] 10.2 Write API integration test: account lockout — 10 bad logins → 11th returns 429 `ACCOUNT_LOCKED`; correct password before 10 failures succeeds
- [x] 10.3 Write API integration test: CSRF — POST without `X-CSRF-Token` returns 403; with matching token succeeds
- [x] 10.4 Write API integration test: `POST /auth/complete-onboarding` — `username` + `displayName` + `language` all persisted; duplicate username → 409
- [x] 10.5 Write API integration test: `GET /auth/check-username` — available returns true, taken returns false
- [x] 10.6 Write frontend component test: signup form — username live check calls API after 400ms debounce; shows "Username taken" when unavailable; form submits with all fields including language
