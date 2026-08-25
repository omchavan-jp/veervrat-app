## Why

**An account with no password cannot delete itself.**

Every sensitive self-service action is gated on knowing a password. An account created with
"Continue with Google" has none, so five flows are closed to it:

| Flow | Today |
|---|---|
| Change password | `EntityNotFoundException('AuthAccount')` |
| Set a first password | no route exists |
| Reset password | `forgotPassword` returns `'sent'` and sends nothing |
| **Delete their own account** | `verifyPassword` → false → `InvalidCredentialsException` |
| **Change their email** | `EntityNotFoundException('AuthAccount')` |

The last two are not inconveniences. Deletion is a data-protection right, and it is question 4 in
the legal briefing prepared for review (#134) — we are about to ask a lawyer what "delete my
account" must mean while a class of users cannot invoke it at all.

Jnana Prabodhini runs Google Workspace, so someone on `@jnanaprabodhini.org` who leaves the
organisation loses their Veervrat account permanently. Confirmed on the project owner's own
production account. There is no administrative route to restore access either (#75).

## What Changes

**1. Re-authentication that is not password-shaped.**

One step that accepts **either** a current password **or** a fresh Google sign-in, used by every
flow that today demands a password. This is the structural change and the reason not to repair
"set password" on its own: doing that would leave a Google user still unable to delete their
account.

**2. Setting a first password.**

In settings, an account with no password sees a panel saying **Google is currently the only way
into this account**, with a *Set a password* action. The warning carries more weight than the
button — the application currently never mentions that such an account has a single point of
failure.

In forgot-password, an address belonging to a Google-only account is told so, and offered a
set-password link rather than silence.

Authorisation is the emailed token, never the live session: a password outlives the session that
created it, and a session only proves a browser signed in at some point in thirty days.

**3. `forgotPassword` stops hiding whether an account exists.**

It answers `'sent'` either way today, intending anti-enumeration. It does not achieve it —
`register()` throws `DuplicateEntityException('User', 'email')`, so signup already answers the
same question to anyone who asks. The vagueness protects nothing and makes a typo
indistinguishable from a delivery failure.

Existing rate limits stay (20 per email + IP per 15 minutes). Those are what actually prevent
bulk checking, which is the real threat.

## What This Does Not Change

- **No SMS codes.** They require collecting phone numbers — more sensitive data gathered than
  protected, the same trade `spec/decisions/21` rejected for age verification.
- **No authenticator-app two-factor.** Worth having eventually; it is a feature, not this repair,
  and it does nothing for someone who has no second factor today.
- **The session is not made sufficient.** `SESSION_TTL_DAYS` is 30.
- **Anti-enumeration elsewhere.** `register()` keeps telling people an address is taken; making
  signup vague to protect a fact that signup itself reveals would cost every new user clarity for
  no gain.

An emailed one-time link already **is** a one-time code — single-use, to a channel the person
controls. A six-digit number over that same channel would add ceremony, not security.
