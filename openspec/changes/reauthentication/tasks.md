## 0. Read first

- [ ] 0.1 `design.md` decision 1 — the five broken flows are one missing concept seen five times.
  Repairing them individually is the thing this change exists to avoid.
- [ ] 0.2 `auth.service.ts` → `forgotPassword`, `changePassword`, `verifyPassword`,
  `requestEmailChange`, and `users.service.ts` → `selfDelete`. All five, before changing any.

## 1. Establish what is actually broken

- [ ] 1.1 Confirm each of the five flows fails for a Google-only account, by exercising them —
  not by reading. Two are already confirmed in production (change password, reset password).
- [x] 1.2 **Already correct.** `disconnectAccount` refuses to remove the only remaining sign-in method? If
  to remove the last method, counting an EMAIL account only when it has a password. Nothing to do.
- [x] 1.3 **A full OAuth redirect** — see design 1a. How a Google assertion is obtained and validated (`google.strategy.ts`)? The
  means freshness must be a stored, short-lived, single-use marker set by the callback, not a
  token parameter. It also means the email-token half of this change can land first, alone.

## 2. The re-authentication step

- [ ] 2.1 Replace `verifyPassword` with a step that accepts a password **or** a fresh Google
  assertion. Its name should say what it establishes, not how.
- [ ] 2.2 Define and enforce **fresh**. A Google token minted at login and replayed later is not
  proof of anything present-tense. Write down the window and reject anything older.
- [ ] 2.3 Every current caller moves to it: `selfDelete`, `requestEmailChange`, `changePassword`.
- [ ] 2.4 Tests per account type — password-only, Google-only, both linked — asserting each flow
  works for each. The Google-only cases are the ones that fail today.

## 3. Setting a first password

- [ ] 3.1 `forgotPassword` sends a **set-password** link for an account with no password, reusing
  the existing token machinery rather than a parallel one.
- [ ] 3.2 The set-password route accepts the token and creates the credential. Invalidate
  outstanding tokens first, as `forgotPassword` already does.
- [ ] 3.3 Existing sessions: `changePassword` currently kills every session and mints a new one.
  Decide whether setting a *first* password should do the same, and write down why. It is not
  obviously the same case.

## 4. Telling the truth

- [ ] 4.1 `forgotPassword` returns three distinct outcomes: no account, account with password,
  account without password. Keep the throttle.
- [ ] 4.2 Frontend: forgot-password reflects all three, including offering the set-password path.
- [ ] 4.3 Settings: an account with no password sees the warning that **Google is the only way
  in**, then the action. Warning first — see design decision 3.
- [ ] 4.4 Replace `EntityNotFoundException('AuthAccount')` wherever it reaches a user. It names a
  database table to somebody changing their password, and it is wrong in substance: nothing is
  missing, the operation does not apply.

## 5. Verify like a person

- [ ] 5.1 On a deployed environment, with a Google-only account: set a password, then delete the
  account, then change an email. All three are impossible today.
- [ ] 5.2 Ask for a reset on an address that does not exist, and confirm it says so.
- [ ] 5.3 Confirm a stale Google assertion is refused (task 2.2). If it is accepted, the step is
  decoration.

⚠️ 5.1 needs a throwaway Google account, not a real one — it ends by deleting the account.
