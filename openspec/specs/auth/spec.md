# Auth Module Spec

## Overview
Custom cookie-based authentication system for the Veervrat platform. NestJS owns all auth logic; the frontend is a UI layer only. Sessions stored in PostgreSQL with rolling expiry.

## Identity Model

```
User (1) ──→ (many) AuthAccount    # one per login method
User (1) ──→ (many) Session        # one per device/browser
User (1) ──→ (many) VerificationToken  # email verify + password reset
```

- One internal User per person, regardless of how many auth methods they have
- Auth establishes **identity** only — authorization (roles, scoped access) is handled separately

## Auth Methods

| Method | Status | Notes |
|---|---|---|
| Email/password | Implemented | bcrypt (12 rounds), email verification required |
| Google OAuth | Implemented | via Passport strategy |
| Additional OAuth | Not implemented | Architecture extensible — add new strategies |

## Session Model

- **Storage**: PostgreSQL `sessions` table (not Redis, not express-session)
- **Token**: `crypto.randomBytes(32).toString('hex')` — 64 char hex
- **Cookie**: `veervrat_session`, HttpOnly, Secure (prod), SameSite=Lax
- **Expiry**: Rolling, configurable via `SESSION_TTL_DAYS` (default 30)
- **Multi-session**: allowed (multiple devices simultaneously)
- **Password reset**: invalidates ALL user sessions

## Endpoints

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/register` | POST | No | Create user + email AuthAccount (accepts displayName, username, email, password, language) |
| `/auth/login` | POST | No | Validate credentials, create session; checks account lockout first |
| `/auth/logout` | POST | Yes | Delete session, clear cookie |
| `/auth/verify-email` | POST | No | Confirm email ownership |
| `/auth/resend-verification` | POST | No | Re-send the verification email. **Identical response for every input** — unknown address, already verified, Google-only, or genuinely unverified — and sends only in the last case. Strict auth throttle; invalidates prior verification tokens |
| `/auth/forgot-password` | POST | No | Send reset token (always 200) |
| `/auth/reset-password` | POST | No | Change password via token |
| `/auth/google` | GET | No | Redirect to Google OAuth |
| `/auth/google/callback` | GET | No | Handle Google callback, redirect to frontend |
| `/auth/complete-onboarding` | POST | Yes | Set onboardingCompletedAt; accept optional username, displayName, language |
| `/auth/check-username` | GET | No | Returns `{ available: boolean }` for a given username |
| `/auth/me` | GET | Yes | Return current user |

All under `/api/v1/` prefix.

## Business Rules

1. Email verification mandatory before login
2. Google OAuth: no auto-link if email matches existing account — a link token is issued and the user confirms with their existing password
3. New OAuth users get `onboardingCompletedAt=null` → redirect to `/onboarding`
4. Forgot-password always returns 200 (no email enumeration)
5. Password reset invalidates all sessions
6. Session validation checks: token exists, not expired, user not soft-deleted
7. Rolling expiry: each authenticated request extends session TTL
8. Account lockout: 10 failed logins within 1 hour → 15-minute Redis lock (see `account-lockout` spec)
9. `completeOnboarding` accepts optional username (uniqueness validated), displayName, language — all individually optional
10. `check-username` format validation: `/^[a-z0-9_]{3,30}$/` — invalid format returns `available: false`
11. **An unverified address must always be recoverable.** Login refuses an unverified address, so
    any flow that proves mailbox ownership marks it verified — otherwise a missed verification
    email leaves the account permanently unusable:
    - completing a **password reset** verifies the address (the token was delivered to it)
    - **linking a Google account** verifies it, but only when Google's own `email_verified`
      claim is true — read, never assumed
    - `/auth/resend-verification` exists so a lost verification email is recoverable at all
12. **Resend and forgot-password must be indistinguishable across inputs.** Any difference in
    status, body or timing answers "does this address have an account?" for any address tried.
    Rate-limit rejections (429) are per-IP and therefore safe to surface; nothing else is.

## Database Schema

### Enums
- `UserRole`: USER, MENTOR, MODERATOR, ADMIN
- `AuthProvider`: EMAIL, GOOGLE
- `VerificationType`: EMAIL_VERIFICATION, PASSWORD_RESET

### Tables
- `users` — id, email, display_name, username, language, email_verified_at, onboarding_completed_at, role, deleted_at, created_at, updated_at
- `auth_accounts` — id, user_id, provider, provider_account_id, password_hash, created_at, updated_at; unique(provider, provider_account_id)
- `sessions` — id, user_id, token (unique), expires_at, last_active_at, ip_address, user_agent, created_at
- `verification_tokens` — id, user_id, token (unique), type, expires_at, used_at, created_at

## Module Structure

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.repository.ts
├── dto/ (register, login, forgot-password, reset-password, verify-email, complete-onboarding)
├── guards/ (session.guard, google-oauth.guard)
├── strategies/ (google.strategy)
├── decorators/ (current-user.decorator)
└── types/ (auth.types)

src/common/
├── guards/csrf.guard.ts
├── middleware/csrf.middleware.ts
└── redis/ (redis.module, redis.provider — REDIS_CLIENT token)

src/modules/email/
├── email.module.ts
├── email.service.ts
└── templates/ (VerifyEmailEmail, PasswordResetEmail)
```

Follows Controller → Service → Repository → Prisma layering. Prisma only in repository.

## Frontend Pages

All pages use React Hook Form + Zod for validation, TanStack Query for server state, shadcn/ui components, and `next-intl` (`useTranslations('auth')`) for all strings — zero hardcoded text in JSX.

### Auth state: seeded, not fetched

The current user is resolved **server-side** in the root layout's server component (`layout.tsx`
calls `getSessionUser()`, which reads the session cookie and queries the database) and passed to
`Providers` as `initialUser`. The provider seeds it into the TanStack Query cache via
`setQueryData` before any client component renders.

This means:
- **No client-side `/auth/me` fetch on page load.** The first render already has the user.
- **No auth flash.** A logged-in user never briefly sees logged-out UI.
- **`null` is never seeded.** If the server can't resolve a user, it passes nothing — the
  query starts in "unknown" state and fetches on its own, which is safe. Seeding `null` would
  suppress that fetch and lock in a false "logged out" conclusion.
- **Invalidation still works.** Login, logout, and 403 responses invalidate the query, which
  triggers a fresh fetch — the seed is initial state only.

### Route Groups

| Group | Guard | Behavior |
|---|---|---|
| `(public)` | Redirect to `/dashboard` if authenticated | Centered card layout |
| `(app)` | Redirect to `/login` if unauthenticated; redirect to `/onboarding` if `onboardingCompletedAt === null` | Header + main content |

### Pages

| Route | Group | Purpose |
|---|---|---|
| `/login` | public | Email/password login, Google OAuth button, handles `?error=OAUTH_ACCOUNT_CONFLICT` |
| `/signup` | public | Registration: displayName, username (live uniqueness check), email, password+strength, language radio |
| `/forgot-password` | public | Email input, always shows "check email" on success |
| `/reset-password?token=` | public | New password + confirm, reads token from URL |
| `/verify-email?token=` | public | Auto-verifies on mount, shows result |
| `/dashboard` | app | Placeholder with user info |
| `/onboarding` | app | displayName, username, language input; calls complete-onboarding |

### Infrastructure

- `lib/api/auth.ts` — typed API functions with `{ data }` envelope unwrapping; includes `checkUsername`
- `lib/validations/auth.ts` — Zod schemas for all forms; `signupSchema` includes displayName, username, language
- `hooks/use-auth.ts` — `useAuth`, `useLogin`, `useSignup`, `useLogout`, `useVerifyEmail`, `useForgotPassword`, `useResetPassword`, `useCompleteOnboarding`
- `messages/en.json` + `messages/mr.json` — `auth` namespace with all page strings
- `i18n/request.ts` — next-intl server config; resolves locale dynamically from `X-Next-Locale` request header (set by middleware) rather than hardcoding `'en'`; falls back to `'en'` if header absent or unrecognised
- `app/(public)/layout.tsx` — server layout wrapping `NextIntlClientProvider`

## Not Yet Implemented

- Re-authentication for sensitive actions
- Admin force-logout

*(Account linking, the email-change flow and auth audit logging have since been built —
corrected 2026-08-20 while archiving `account-verification-recovery`.)*

## References

- `documentation/14_Auth-Architecture-Decision.md` — full architecture rationale
- `documentation/11_Backend-Conventions.md` — layering and module patterns
- `documentation/12_API-Conventions.md` — endpoint design conventions
- `openspec/specs/csrf-protection/spec.md` — CSRF double-submit cookie spec
- `openspec/specs/rate-limiting/spec.md` — throttler limits per route
- `openspec/specs/account-lockout/spec.md` — Redis-backed lockout spec
- `openspec/specs/email-module/spec.md` — EmailService and templates spec
