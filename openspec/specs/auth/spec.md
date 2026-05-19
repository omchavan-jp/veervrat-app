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
| `/auth/register` | POST | No | Create user + email AuthAccount |
| `/auth/login` | POST | No | Validate credentials, create session |
| `/auth/logout` | POST | Yes | Delete session, clear cookie |
| `/auth/verify-email` | POST | No | Confirm email ownership |
| `/auth/forgot-password` | POST | No | Send reset token (always 200) |
| `/auth/reset-password` | POST | No | Change password via token |
| `/auth/google` | GET | No | Redirect to Google OAuth |
| `/auth/google/callback` | GET | No | Handle Google callback, redirect to frontend |
| `/auth/me` | GET | Yes | Return current user |

All under `/api/v1/` prefix.

## Business Rules

1. Email verification mandatory before login
2. Google OAuth: no auto-link if email matches existing account
3. New OAuth users get `onboardingCompletedAt=null` → redirect to `/onboarding`
4. Forgot-password always returns 200 (no email enumeration)
5. Password reset invalidates all sessions
6. Session validation checks: token exists, not expired, user not soft-deleted
7. Rolling expiry: each authenticated request extends session TTL

## Database Schema

### Enums
- `UserRole`: USER, MENTOR, MODERATOR, ADMIN
- `AuthProvider`: EMAIL, GOOGLE
- `VerificationType`: EMAIL_VERIFICATION, PASSWORD_RESET

### Tables
- `users` — id, email, name, email_verified_at, onboarding_completed_at, role, deleted_at, created_at, updated_at
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
├── dto/ (register, login, forgot-password, reset-password, verify-email)
├── guards/ (session.guard, google-oauth.guard)
├── strategies/ (google.strategy)
├── decorators/ (current-user.decorator)
└── types/ (auth.types)
```

Follows Controller → Service → Repository → Prisma layering. Prisma only in repository.

## Not Yet Implemented

- CSRF token protection (SameSite=Lax baseline only)
- Account linking/unlinking
- Re-authentication for sensitive actions
- Email change flow
- Rate limiting on auth endpoints
- Audit logging of auth events
- Admin force-logout
- Email service (console.log placeholder — Resend integration pending)

## References

- `documentation/Auth Architecture Decision - v1.md` — full architecture rationale
- `documentation/Backend Conventions - v1.md` — layering and module patterns
- `documentation/API Conventions - v1.md` — endpoint design conventions
