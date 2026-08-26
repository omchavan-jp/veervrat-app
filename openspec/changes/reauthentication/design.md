## Context

Verified in the source before designing:

- `auth.service.ts` → `verifyPassword` returns `false` when there is no `passwordHash`. It is the
  gate `users.service.ts` → `selfDelete` uses, so a Google-only account cannot delete itself.
- `requestEmailChange` and `changePassword` both throw `EntityNotFoundException('AuthAccount')`
  for the same reason — an internal model name reaching the user.
- `forgotPassword` returns `'sent'` for a Google-only account and sends nothing, with the comment
  *"they will simply log in with Google"*.
- `register()` throws `DuplicateEntityException('User', 'email')` — the existence oracle the
  vagueness elsewhere is trying to close.
- A password-reset token flow already exists end to end: generate, store with expiry, invalidate
  prior tokens of the same type, email a link.
- `SESSION_TTL_DAYS` defaults to 30.

## Goals / Non-Goals

**Goals**
- No self-service action is impossible because of *how* someone signs in.
- A person is told the truth about their own account's state.
- One place decides "have you proved it is you", so a future sign-in method plugs into one seam.

**Non-Goals**
- Second factors of any kind.
- Changing what deletion does (`spec/06`).
- Making the session a sufficient proof.

## Decisions

### 1. Re-authentication is a capability, not a password check

Replace `verifyPassword(userId, password)` — which encodes "the proof is a password" in its name
and its signature — with a step that asks a different question: *has this person just proved they
are the account holder?*

It accepts either:

- **a current password**, when the account has one; or
- **a fresh Google assertion**, when the account is linked to Google.

**Why this rather than repairing each flow:** the five broken flows are one missing concept seen
five times. Fixing `changePassword` alone leaves deletion broken, and the next sign-in method
breaks all of them again. The alternative — a `hasPassword` branch inside each caller —
distributes the same decision to five places that must agree, which is the arrangement #178 spent
a day removing from the uploads path.

**Considered and rejected:** keeping `verifyPassword` and adding `verifyGoogle` beside it. Each
call site then chooses, which is exactly the per-site security decision this avoids.

### 1a. "Fresh Google" is a redirect, not a parameter — found in task 1.3

Google sign-in here is a **full OAuth redirect flow**: `google.strategy.ts` uses Passport with a
`callbackURL`, and the browser leaves the site and returns through `/auth/google/callback`. There
is no client-side token the frontend can pass to an API call.

So re-authentication with Google cannot be `reauthenticate({ googleToken })`. It has to be:

1. the action begins and says it needs proof;
2. the browser is sent to Google, carrying the *intent* in the OAuth `state` — the same slot that
   already carries a pending-signup id;
3. the callback records that this person re-authenticated **just now**;
4. the action proceeds, consuming that record.

**Freshness is therefore a stored, short-lived, single-use marker**, not a claim inside a token.
It must be consumed on use, or a single re-auth authorises every sensitive action for its
lifetime — which is the replay this is meant to prevent.

**Consequence for sequencing:** the password half of this change needs none of that machinery,
and the flows people are locked out of are mostly reachable through it. The email-token work can
land first and stand on its own; the Google redirect follows.

### 2. Setting a first password is authorised by email, not by the session

The token flow that already exists is reused: the account receives a link, and following it sets
the password.

**Why not the live session:** a session proves a browser signed in at some point within thirty
days. A password is a credential that outlives it — issued once, usable indefinitely, and usable
from anywhere. Creating one should cost proof of the mailbox, which is the same proof the reset
flow already demands of everyone else.

**Considered and rejected:** allowing it straight from an authenticated settings page. It is what
a user would expect, and it means a stolen or borrowed session converts into a permanent
credential. The extra step is one email.

### 3. The settings panel leads with the warning, not the button

For an account with no password, settings says **Google is currently the only way into this
account** before offering to add one.

**Why:** the button is the smaller half. Nobody in this state knows they are one lost Google
account away from losing everything — the application has never said so. A panel that only
offered "Set a password" would be a feature; one that explains why reads as a warning, which is
what it is.

### 4. `forgotPassword` tells the truth

Three distinct answers instead of one:

- **no such account** → say so
- **account with a password** → reset link, as today
- **account with no password** → say it signs in with Google, and offer a set-password link

**Why:** the vagueness fails at its own purpose. `register()` already answers "does this address
have an account" to anyone who asks. Keeping the pretence only costs a real person a silent wait,
where a typo is indistinguishable from a delivery failure.

**Considered and rejected:** making `register()` vague too, so the secret is genuinely kept. It is
the internally consistent option, and it makes signup worse for every new user — "something went
wrong" instead of "that address is already registered" — to protect a fact that is guessable on
any platform where people know one another. The rate limits are the real control.

**Risk accepted, and named:** this makes checking one address slightly easier than filling in a
signup form. The mitigation is the existing throttle — **5 per hour** on this route — which is
what stops the volume that would make enumeration worth doing.

**Consistency, stated rather than dodged:** `resend-verification` carries an explicit comment
saying not to do what this change does. That divergence is now recorded in the controller. The
argument applies to both routes; the reason for changing only one is that being locked out is
when ambiguity hurts most, and resending a verification mail is not that moment. It is a
judgement, and it should be revisited deliberately rather than for tidiness.

## Risks / Trade-offs

- **A Google account that is later disconnected must not strand the person again.** ✅ Checked in
  task 1.2: `disconnectAccount` already refuses, counting an EMAIL account as a login method only
  when it actually has a password. Nothing to do — recorded because it looked like a gap and is
  not.
- **Fresh Google assertion has a definition problem.** "Fresh" must mean a sign-in performed for
  *this* action, not a token minted at login and replayed. The design must state how that is
  enforced, and the implementation must not quietly accept an old one.
- **Telling users an account does not exist is a one-way disclosure.** Accepted above, with the
  reasoning recorded so it can be revisited if the platform's audience changes.
