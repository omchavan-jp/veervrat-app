## Why

When a user who registered with email+password tries "Continue with Google" using the same email, they hit a hard error with no path forward. The auth architecture spec mandates an explicit confirmation flow for this case (§7: "require explicit confirmation / verification flow") — that flow was never built, leaving the spec partially implemented.

## What Changes

- Google OAuth callback detects email conflict → instead of erroring, issues a short-lived link-pending token and redirects to a new frontend page `/link-account?token=<token>`
- New page `/link-account` explains the situation and prompts for the existing account's password
- New endpoint `POST /auth/link-google` verifies the password, creates the Google `auth_accounts` record on the existing user, creates a session, and returns the user
- After linking, future Google sign-ins for that email work via the existing `handleGoogleLogin` happy path (no further changes needed there)
- The `OAUTH_ACCOUNT_CONFLICT` error redirect from `googleCallback` is replaced by the `LINK_PENDING` redirect
- `VerificationType` enum gains a `GOOGLE_LINK` variant to store the pending link token in the existing `verification_tokens` table

## Capabilities

### New Capabilities
- `google-account-link`: Explicit password-confirmation flow for linking a Google account to an existing email+password account

### Modified Capabilities
- None — no existing spec-level requirements change; this implements a previously unbuilt part of the auth spec

## Impact

**Backend:**
- `apps/api/prisma/schema.prisma` — add `GOOGLE_LINK` to `VerificationType` enum, new migration
- `apps/api/src/modules/auth/auth.service.ts` — `handleGoogleLogin`: replace `throw OAuthAccountConflictException` with link-token creation; new `linkGoogleAccount` method
- `apps/api/src/modules/auth/auth.repository.ts` — new `addAuthAccount` method
- `apps/api/src/modules/auth/auth.controller.ts` — `googleCallback` redirect logic; new `POST /auth/link-google` endpoint
- `apps/api/src/modules/auth/dto/` — new `LinkGoogleDto`

**Frontend:**
- `apps/web/app/(public)/link-account/page.tsx` — new page
- `apps/web/lib/api/auth.ts` — new `linkGoogle` API function
- `apps/web/hooks/use-auth.ts` — new `useLinkGoogle` mutation hook
- `apps/web/messages/en.json`, `mr.json` — new i18n keys for link-account page

**No new dependencies.** Uses existing `VerificationToken` table, `bcrypt`, session creation, and the existing `verification_tokens` expiry pattern.
