## Context

The auth architecture spec (§7) states: when a logged-out user signs in via Google with an email matching an existing credentials account, do **not** auto-link — require explicit confirmation. The current `handleGoogleLogin` implementation throws `OAuthAccountConflictException`, which redirects the frontend to `/login?error=OAUTH_ACCOUNT_CONFLICT`. This satisfies "do not auto-link" but ignores "require explicit confirmation."

The existing `VerificationToken` table already handles short-lived, one-time tokens (email verification, password reset) and is the right home for the link-pending state. No new tables are needed.

## Goals / Non-Goals

**Goals:**
- Replace the dead-end conflict error with a usable password-confirmation flow
- Reuse existing patterns: `VerificationToken`, `createSession`, bcrypt verify, response interceptor
- Keep the happy path (`handleGoogleLogin` when Google account already linked) completely untouched
- Token expires in 15 minutes — short enough to prevent stale link abuse

**Non-Goals:**
- Linking providers while logged in (that belongs in account settings, spec'd separately in `spec/decisions/26_account-settings.md`)
- Supporting providers other than Google (no other OAuth providers planned for v1)
- Automatic linking without user confirmation (explicitly ruled out in §7)

## Decisions

### Decision 1: Short-lived token stored in `verification_tokens`, not Redis

**Chosen:** Add `GOOGLE_LINK` to the `VerificationType` enum and store the pending link state as a `VerificationToken` row. The token carries the Google profile data needed to create the `AuthAccount` after password confirmation.

**Alternative considered:** Store pending Google profile in Redis with a UUID key. Simpler to implement but Redis is optional infrastructure (it was down earlier today) and a Redis outage would break the link flow for users mid-confirmation. The DB-backed token is more durable.

**Why not just re-redirect through Google on submit?** Re-running the full OAuth flow to confirm identity would require storing state across two OAuth round-trips, which is more complex and fragile than a simple password check against the existing credentials account.

### Decision 2: Google profile data encoded in token, not a separate table

**Chosen:** The token string is a random hex token (same as email/password-reset tokens). The `googleId` and `googleEmail` needed to create the `AuthAccount` are stored alongside it — but `VerificationToken` has no `metadata` column. We'll add a nullable `metadata jsonb` column to `verification_tokens` via migration to carry `{ googleId, googleEmail, displayName }`.

**Alternative considered:** Store `googleId` in a separate `pending_google_links` table. Adds schema complexity for a simple one-off flow. The `metadata` column on `verification_tokens` is generically useful for future token types too.

### Decision 3: Frontend page at `/link-account` (public route group)

The page sits in `(public)/link-account/` alongside login and verify-email. It is a client component (needs form state) that reads `?token=` from search params, shows a password input, and calls `POST /auth/link-google`. On success, it calls `useLogin`'s existing `onSuccess` logic (set query cache + redirect).

### Decision 4: `googleCallback` redirects on conflict instead of throwing

Current: `throw OAuthAccountConflictException()` → caught in the try/catch → `res.redirect(.../login?error=OAUTH_ACCOUNT_CONFLICT)`.

New: Generate the link token, redirect to `.../link-account?token=<token>`. The try/catch still catches any other errors and falls back to the existing `AUTH_ERROR` redirect.

## Risks / Trade-offs

- **[Risk] Token metadata column migration on production** → Mitigation: column is nullable, migration is non-breaking, no backfill needed.
- **[Risk] User abandons the link-account page** → The token expires in 15 minutes. Next Google sign-in attempt generates a fresh token. No orphaned state.
- **[Risk] Password field on the link-account page could confuse users** → Mitigation: clear copy ("Enter the password for your existing Veervrat account") and show the email address the conflict was detected on.
- **[Trade-off] Google profile data in `metadata` jsonb** — typed loosely. Acceptable: it's consumed immediately after the password check and the token is then marked used. No long-lived reliance on the json shape.

## Migration Plan

1. Add `GOOGLE_LINK` to `VerificationType` enum + nullable `metadata jsonb` to `verification_tokens` → Prisma migration
2. Deploy backend (new endpoint and updated `googleCallback` redirect go live together)
3. Deploy frontend (`/link-account` page)
4. No rollback complexity — old `OAUTH_ACCOUNT_CONFLICT` redirect can be restored in one line if needed
