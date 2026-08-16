# Auth Architecture Decision — v1

## 1. Auth ownership
- **NestJS is the source of truth for authentication**
- Next.js acts as the client/UI layer
- authentication logic is not owned by the frontend framework

## 2. Authentication methods
Support initially:
- **Google OAuth**
- **email/password**

Not included initially:
- magic link login
- additional OAuth providers beyond Google

But architecture must support adding more OAuth providers later.

## 3. Session model
- use **secure cookie-based sessions**
- session is created and managed by Nest
- session data is stored in **PostgreSQL**
- Redis is **not required initially** for auth

## 4. Identity model
Use a single internal app user identity:
- one `User`
- many linked auth methods/accounts
- many sessions

Conceptually:
- `users`
- `auth_accounts`
- `sessions`

## 5. Credentials auth rules
- email/password signup allowed for public users
- password stored as secure hash
- **email verification required**
- password reset supported

## 6. OAuth rules
- Google OAuth supported initially
- Google login creates or links to internal user identity
- architecture remains extensible for future providers

## 7. Account linking rules
### If user is logged in
- they may manually connect additional auth providers from account settings

### If user is not logged in and signs in via Google with an email matching an existing credentials account
- do **not** auto-link
- require explicit confirmation / verification flow

## 8. Multi-session policy
- multiple active sessions/devices are allowed

## 9. Role relationship to auth
- auth establishes identity
- roles/permissions are handled separately in authorization
- elevated roles are not granted implicitly by OAuth/signup
- roles are stored in app DB, not external provider claims

## 10. Separation of concerns
Keep these separate:
- auth identity and login methods
- sessions
- app user record
- profile/domain data
- authorization rules

## 11. Session lifecycle
- sessions use a **rolling expiry** — activity extends the session
- reasonable TTL (e.g. 7–30 days idle timeout)
- explicit logout deletes the current session server-side
- **password reset invalidates all sessions** for that user
- admin "force logout" capability should exist for moderation/security

## 12. Sensitive action re-authentication
Certain actions require the user to have authenticated recently (not just have a valid session):
- changing password
- changing primary email
- linking or unlinking auth providers
- deleting account

If last authentication was not recent, prompt for password or OAuth re-auth before proceeding.

## 13. Email ownership and change
- users may change their primary email
- new email **must be verified** before it replaces the old one
- if the new email conflicts with an existing account, the change is rejected
- old email remains active until new one is confirmed

## 14. OAuth first-login onboarding
- first Google OAuth login creates an internal user account
- account is marked as **onboarding incomplete**
- user is redirected to a profile/onboarding flow before full app access
- this allows collecting any required profile data not provided by the OAuth provider

## 15. CSRF protection
- since auth uses cookie-based sessions, **CSRF protection is required** on all state-changing endpoints (POST, PATCH, DELETE)
- **Strategy: double-submit cookie**
  - on session creation, NestJS generates a random CSRF token and sets it as a non-HttpOnly cookie (`csrf-token`, `SameSite=Lax`, `Secure`)
  - frontend reads this cookie via JS and sends it as `X-CSRF-Token` header on all state-changing requests
  - NestJS guard validates that the header value matches the cookie value
  - token is regenerated on session rotation (login, password change)
- `SameSite=Lax` on session cookie as additional baseline defense
- session cookies must be `HttpOnly` and `Secure`
- WebSocket: CSRF not applicable — socket auth validates the session cookie on handshake, and sockets are not subject to cross-origin form submission attacks

## 16. Rate limiting and brute force protection
- **Library:** `@nestjs/throttler` — applied globally with per-route overrides
- **Route-specific limits:** see `Platform-Engineering-Standard.md` numeric constants table for exact values per route
- **Account lockout:** after 10 failed login attempts for the same email within 1 hour, the account is temporarily locked for 15 minutes. The user is informed ("Too many attempts, try again in 15 minutes"). Lockout state stored in Redis.
- **Password policy (v1):** minimum 8 characters, at least one letter and one digit. No dictionary check. Strength meter shown in UI (weak/ok/strong) but does not block submission.
- **Abuse monitoring:** all auth failures (login, password reset, OAuth errors) are logged with IP, user-agent, and email. Spike detection (>50 auth failures/min globally) triggers a **Sentry** alert
(GlitchTip was dropped — D8; implementation pending, B13). No automated IP banning in v1 — manual review.
