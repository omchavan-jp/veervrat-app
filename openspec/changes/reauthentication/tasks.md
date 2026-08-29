## 0. Read first

- [x] 0.1 `design.md` decision 1 — the five broken flows are one missing concept seen five times.
  Repairing them individually is the thing this change exists to avoid.
  Done 2026-08-28: read and confirmed. `assertRecentlyAuthenticated` is the single gate;
  all five callers use it.
- [x] 0.2 `auth.service.ts` → `forgotPassword`, `changePassword`, `verifyPassword`,
  `requestEmailChange`, and `users.service.ts` → `selfDelete`. All five, before changing any.
  Done 2026-08-28: all five read. `forgotPassword` returns three outcomes (no_account,
  set_password_sent, reset_sent). `changePassword` throws `NoPasswordSetException`.
  `requestEmailChange` and `selfDelete` use `assertRecentlyAuthenticated`. `verifyPassword`
  is internal only — callers use the gate.

## 1. Establish what is actually broken

- [x] 1.1 Confirm each of the five flows fails for a Google-only account, by exercising them —
  not by reading. Two are already confirmed in production (change password, reset password).
  Done 2026-08-28 (retrospective): implementation landed before this task was ticked.
  Pre-fix behaviour confirmed via: production reports (change password, reset password),
  test expectations in auth.service.account.spec.ts and auth.service.password-recovery.spec.ts.
  Post-fix: all 10 auth account tests + all recovery tests pass with the corrected behaviour.
- [x] 1.2 **Already correct.** `disconnectAccount` refuses to remove the only remaining sign-in method? If
  to remove the last method, counting an EMAIL account only when it has a password. Nothing to do.
- [x] 1.3 **A full OAuth redirect** — see design 1a. How a Google assertion is obtained and validated (`google.strategy.ts`)? The
  means freshness must be a stored, short-lived, single-use marker set by the callback, not a
  token parameter. It also means the email-token half of this change can land first, alone.

## 2. The re-authentication step

- [x] 2.1 Replace `verifyPassword` with a step that accepts a password **or** a fresh Google
  assertion. Its name should say what it establishes, not how.
- [x] 2.2 Define and enforce **fresh**. A Google token minted at login and replayed later is not
  proof of anything present-tense. Write down the window and reject anything older.
- [x] 2.3 Every current caller moves to it: `selfDelete`, `requestEmailChange`, `changePassword`.
- [x] 2.4 Tests per account type — password-only, Google-only, both linked — asserting each flow
  works for each. The Google-only cases are the ones that fail today.

## 3. Setting a first password

- [x] 3.1 `forgotPassword` sends a **set-password** link for an account with no password, reusing
  the existing token machinery rather than a parallel one.
- [x] 3.2 `resetPassword` accepts the token and creates the credential. Invalidate
  outstanding tokens first, as `forgotPassword` already does.
- [x] 3.3 **Decided: yes, sessions are still cleared.** `resetPassword` already deletes every
  session, and setting a first password goes through the same path, so it inherits that. Kept
  rather than special-cased: whoever asked for the mail may not be whoever is holding an open
  session, and a new credential should not leave older sessions authorised. The cost is signing
  in again — small, and on the safe side of a question about who is present.

## 4. Telling the truth

- [x] 4.1 `forgotPassword` returns three distinct outcomes: no account, account with password,
  account without password. Keep the throttle.
- [x] 4.2 Frontend: forgot-password reflects all three, including offering the set-password path.
- [x] 4.3 Settings: an account with no password sees the warning that **Google is the only way
  in**, then the action. Warning first — see design decision 3.
  Confirmed in a browser on UAT 2026-08-29: the heading, the consequence ("if you lose access to
  that Google account, you lose access here too"), then *Set a password*. Warning above action,
  as the decision requires.
- [x] 4.4 Replace `EntityNotFoundException('AuthAccount')` wherever it reaches a user. It names a
  database table to somebody changing their password, and it is wrong in substance: nothing is
  missing, the operation does not apply.
  Done 2026-08-27: `changePassword` → `NoPasswordSetException` (HTTP 422, error code
  `NO_PASSWORD_SET`). `disconnectAccount` → `EntityNotFoundException('Login method', ...)`.
  Comment on line 833 (requestEmailChange) left as historical context — the throw was already
  replaced by `assertRecentlyAuthenticated` in a prior change.

## 5. Verify like a person

- [x] 5.1 On a deployed environment, with a Google-only account: set a password, then delete the
  account, then change an email. All three are impossible today.
  Done 2026-08-29, in a browser, on UAT, across two throwaway Google accounts.

  **Account A** — set a password via the forgot-password link (`set_password_sent`, not
  `reset_sent`, so the three outcomes of task 4.1 are distinguished on a deployed environment);
  changed the email; deleted the account.

  **Account B** — kept Google-only, no password. Both *change email* and *delete account* offered
  **Verify with Google**. This is the half that matters and the order above cannot reach: setting
  a password first converts the account, after which those two flows exercise the password path
  instead. Task 4.3's either/or branch is what makes the written order misleading — recorded here
  rather than silently reinterpreted.

  Two defects found in the process, both fixed and deployed: an email change onto an address a
  deleted account still claimed failed on the unique index, and deleting an account reported
  "your session has expired" for a deletion that had succeeded.

- [x] 5.2 Ask for a reset on an address that does not exist, and confirm it says so.
  Done 2026-08-29, in a browser on UAT. The page reads "No account for that address — we could
  not find an account for that email address. Check it for a typo, or create an account", and
  offers *Create an account* alongside *Back to login*.

  Both halves of what #196 asked for: it names the outcome instead of the old unconditional
  "sent", and it offers the next step rather than leaving someone to guess. A typo and a
  delivery failure are no longer the same experience.

- [x] 5.3 Confirm a stale Google assertion is refused (task 2.2). If it is accepted, the step is
  decoration.
  Done 2026-08-29, in a browser on UAT, both halves.

  **Single-use.** After verifying with Google and spending the proof on an email change, the next
  action asked for Google again rather than accepting the spent stamp.
  `consumeSessionReauthentication` clears it in the same conditional UPDATE that checks it (§7),
  which is what makes two concurrent requests unable to both spend one.

  **Expiry.** The stamp was obtained and left unused past the ten-minute window, then a gated
  action attempted. Refused, with "that confirmation has expired — it is only good for a few
  minutes, and for one action. Please verify again."

  So the step is not decoration: a proof minted earlier and replayed later buys nothing.

  ⚠️ **The first attempt at this test found a defect rather than passing.** The refusal was
  correct but arrived as a 401, which `apps/web/lib/api/client.ts` reads as the session having
  ended — so the person was signed out instead of asked to verify again, and the settings page
  went on claiming they were verified because `reauthed` came from a query parameter that never
  expired. Fixed and deployed (PR #246) before this task was ticked; the same defect signed
  people out for mistyping their own password, which was also confirmed fixed.

  Worth keeping in view: for ten minutes this looked like a working gate. What it was doing to
  the session only showed up because somebody waited out the window and watched what happened
  next, rather than checking that the action was refused.

⚠️ 5.1 needs a throwaway Google account, not a real one — it ends by deleting the account. Two
are needed, not one, for the reason recorded above.


## 6. Carried forward, not done here

- [x] 6.1 **Done.** Delete and email change now accept either proof. `reauthenticated_at` on the
  session, stamped by the OAuth callback, consumed on use.
- [x] 6.2 `changePassword` still throws `EntityNotFoundException('AuthAccount')` for an account
  with no password. Unreachable from the UI now (settings shows the set-password panel instead),
  but the API still answers that way to a direct caller. Task 4.4.
  Done 2026-08-27: resolved by task 4.4 — now throws `NoPasswordSetException`.
- [ ] 6.3 **The new Marathi strings are unreviewed.** Written by a non-speaker, same caveat as
  #154 — and #154's pack covers policy documents, not interface copy. Worth adding to whatever
  review that becomes.
  Grew on 2026-08-29. The deleted-account and error-reporting fixes added nine more strings in
  both locales, Marathi again by a non-speaker: `auth.errors.accountDeleted*` (five) and
  `confirmEmailChange.error_*` (four). Same caveat, larger pack.


## 7. Freshness, as actually implemented

**10 minutes, single-use, bound to the session.**

- *Bound to the session*, not the user: a marker keyed to a user could be spent from any browser
  holding a session for them, so proving yourself on a phone would authorise a deletion from a
  shared desktop.
- *Consumed*, not read: `consumeSessionReauthentication` clears the stamp in the same conditional
  UPDATE that checks it, so two concurrent requests cannot both spend one — the second matches
  zero rows. Checking and then clearing would leave exactly that race.
- *10 minutes* lives in the service, not the schema. A column storing an expiry would put the
  policy where changing it needs a migration.

The dangerous case has its own test: re-authenticating with **somebody else's** Google account
stamps nothing and returns false. The callback also must not fall through to `handleGoogleLogin`,
which would issue a session for whoever signed in — handing over the wrong account entirely.
