## 0. Read first

- [x] 0.1 `documentation/14_Auth-Architecture-Decision.md` §15–16 (throttles, lockout) and the
  anti-enumeration shape of `forgotPassword` in `auth.service.ts`. This change is mostly about
  matching an existing pattern, not inventing one.

## 1. Repository + strategy groundwork

- [x] 1.1 ~~Add `markEmailVerified(userId)`~~ — **already existed** in `auth.repository.ts`; the
  proposal's claim that it was inline was wrong. Three callers now use it.
- [x] 1.2 Carry Google's `email_verified` claim through `strategies/google.strategy.ts` — it is
  present in the profile and currently dropped. Without it, decision 2 cannot be honoured.

## 2. Verify on proof of mailbox control

- [x] 2.1 `resetPassword` marks the address verified on success.
- [x] 2.2 `linkGoogleAccount` marks it verified **only when** Google's `email_verified` is true.
- [x] 2.3 Unit tests for both, including the negative: `email_verified` false or absent links the
  account but leaves the address unverified.

## 3. Resend endpoint

- [x] 3.1 `resendVerification(email)` in `auth.service.ts`. Returns `'sent'` unconditionally;
  sends only for an unverified credential account. Invalidate outstanding
  `EMAIL_VERIFICATION` tokens first, as `forgotPassword` does.
- [x] 3.2 `POST /auth/resend-verification` in `auth.controller.ts`, under the **strict auth
  throttle** — same treatment as `forgot-password`.
- [x] 3.3 Tests for all four input cases (unknown / verified / Google-only / unverified),
  asserting **response equality**, not just success. A test that only checks 200 will not catch
  a body or shape difference creeping in later.
- [x] 3.4 Test that a second resend invalidates the first link.

## 4. The interface

- [x] 4.1 Surface `EMAIL_NOT_VERIFIED` on the login page as an explanation plus a resend action,
  rather than a bare failure.
- [x] 4.2 Strings in `en.json` and `mr.json` — no hardcoded text.
- [x] 4.3 Confirm the resend action reports success identically whatever the address, so the UI
  does not undo the API's anti-enumeration property.

## 5. Verification

- [x] 5.1 Full unit + integration suite green.
- [ ] 5.2 **On UAT, in a browser:** register a throwaway `+` alias, ignore the first email, use
  resend, verify, log in. That is the whole user journey this change exists for.
- [ ] 5.3 **On UAT:** confirm the maintainer's existing dead account recovers — reset the
  password on `om.chavan501@gmail.com` and log in with credentials. It is the live reproduction,
  so it is also the acceptance test.
- [ ] 5.4 Confirm the throttle actually applies to the new route (repeat until refused).

## 6. Ship

- [ ] 6.1 PR, merge, UAT auto-deploys; re-run §5.2 against the deployed build.
- [ ] 6.2 CHANGELOG entry — user-visible.
- [ ] 6.3 Close #74 with the resend flow described, and note the interaction with #76 (IP
  throttle trips before lockout) if it surfaces during 5.4.
- [ ] 6.4 Archive this change.
