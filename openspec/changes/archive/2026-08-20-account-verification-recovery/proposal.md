## Why

**An account that misses its verification email is bricked, permanently, with nothing in the
product offering a way out.**

Login refuses any address where `emailVerifiedAt` is null (`auth.service.ts` →
`EmailNotVerifiedException`). Exactly **one** thing in the system ever sets that column: clicking
the link in the verification email. Miss it, lose it, or — as happened here for a week — have
the transport silently unwired, and the account can never be logged into again.

Three routes that prove mailbox ownership at least as well as that link, and none of them clear it:

1. **Password reset.** A reset can only be completed by receiving mail at the address. It updates
   the password hash and nothing else. The user resets successfully, then still cannot log in.
2. **Google account linking.** Google confirms the address, the user proves their existing
   password, the accounts link, a session is issued — and credential sign-in on that same account
   *still* answers "verify your email". Hit for real on 2026-08-18.
3. **There is no resend.** `auth.controller.ts` exposes `forgot-password` and `verify-email` and
   nothing else, so a lost verification mail is unrecoverable by the user.

The UI compounds it: login returns a bare refusal with no explanation and no next step.

This is not theoretical and it is not rare — it is the default outcome for anyone whose first
email lands in spam. It has already produced one dead account belonging to the person running
the project, and it will hit beta testers who have no way to ask for help.

## What Changes

**1. Completing a password reset marks the address verified.**
Receiving the reset token *is* proof of control of the mailbox — the same proof the verification
link provides. Treating one as sufficient and the other as not is an inconsistency, not a
security boundary.

**2. Linking a Google account marks the address verified — when Google says it is verified.**
Google's `email_verified` claim is checked rather than assumed. The strategy currently discards
it: `google.strategy.ts` maps only `id`, `emails[0].value` and `displayName`, so the claim has to
be captured first. If Google has *not* verified the address, nothing is marked.

**3. A `POST /auth/resend-verification` endpoint.**
Two properties matter more than the feature itself:

- **It must not become an account-enumeration oracle.** Always the same response and timing
  regardless of whether the address exists, is already verified, or is a Google-only account.
  `forgotPassword` already establishes this pattern — return `'sent'` unconditionally.
- **It must not become a spam relay.** It sends mail to an attacker-chosen address, so it needs
  the strict auth throttle, plus invalidation of prior tokens on each request (as
  `forgotPassword` does) so the endpoint cannot be used to flood one inbox.

**4. The login failure explains itself and offers the way out.**
`EmailNotVerifiedException` currently surfaces as an unexplained refusal. It should say the
address needs verifying and offer to resend, bilingually.

### Explicitly not in scope

- **Changing whether verification is required at all.** It stays required; this is about
  recovering from an unverified state, not removing the state.
- **Admin-side verification** — an admin marking a user verified belongs with #40's admin
  surface and #75's data-administration gap.
- **Email-change verification**, which already has its own flow and is not broken.

## Impact

- Affected specs: `auth`
- Affected code: `auth.service.ts` (`resetPassword`, `linkGoogleAccount`, new
  `resendVerification`), `auth.controller.ts`, `strategies/google.strategy.ts`,
  `auth.repository.ts` (a `markEmailVerified` helper — the update currently only exists inline in
  the verify-email path), and the login page in `apps/web`.
- **Security-sensitive.** The failure modes are enumeration and outbound spam, neither of which
  shows up in a happy-path test. Negative tests are required, not optional:
  a non-existent address must be indistinguishable from a real one, and the throttle must
  actually apply.
- **No migration.** `emailVerifiedAt` already exists; only what writes to it changes.
- Fixes existing dead accounts on UAT as a side effect — including the maintainer's, which is
  currently the live reproduction.
