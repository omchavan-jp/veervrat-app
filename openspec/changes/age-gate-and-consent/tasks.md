## 0. Read first

- [ ] 0.1 `spec/decisions/21_age-and-personal-attributes.md` — the decisions this implements, and
  what was rejected. Do not re-derive them.
- [ ] 0.2 `design.md` here — particularly why the date of birth does not travel in the OAuth
  `state` parameter, and why consent is written in the same transaction as the account.
- [ ] 0.3 `apps/api/src/modules/auth/auth.service.ts` → `handleGoogleLogin`. Three branches
  today: existing auth account, existing user by email (link), and **create**. The third is what
  changes.

## 1. Schema

- [ ] 1.1 `dob` becomes non-nullable on `User`.
- [ ] 1.2 `version` on the policy documents, bumped deliberately by an administrator.
- [ ] 1.3 A consent record: user, document key, version, accepted-at. Unique per user, document
  and version.
- [ ] 1.4 A pending-signup record: opaque id, date of birth, consent, expiry.
- [ ] 1.5 Migration. No backfill — see `design.md`.

## 2. Age validation

- [ ] 2.1 Server-side check of 18+ at account creation, from the date of birth.
- [ ] 2.2 Applied to **both** the email path and the Google path. A gate on one is not a gate.
- [ ] 2.3 Client-side check on the form for immediate feedback — never the only check.
- [ ] 2.4 Date picker defaults to today minus eighteen years, and treats it as the maximum.
- [ ] 2.5 Persistent hint under the field stating the age requirement, shown before any attempt.
- [ ] 2.6 Disabled dates use `aria-disabled` and stay reachable — `disabled` swallows the click
  and hides them from screen readers, so the explanation never reaches the people who need it.
- [ ] 2.7 Inline field error on submit, at the field. Not a toast.

## 3. Consent

- [ ] 3.1 Record consent **in the same transaction** as account creation.
- [ ] 3.2 Read the current version at the moment of acceptance rather than trusting the client.
- [ ] 3.3 Re-prompt when the accepted version is behind the current one.

## 4. Splitting the Google flows

- [ ] 4.1 Signup: collect date of birth and consent, create a pending record, redirect with its
  identifier.
- [ ] 4.2 Callback: resolve the pending record; create the account only when one exists and is
  valid.
- [ ] 4.3 Sign-in: authenticate an existing account only. **Remove the create branch from this
  path**, and send an unknown user to signup.
- [ ] 4.4 Leave account linking from settings unchanged — the account already exists.
- [ ] 4.5 Expire and clean up pending records.

## 5. Web

- [ ] 5.1 Date of birth and consent on the signup form; both Google buttons point at their own
  flow.
- [ ] 5.2 Remove date of birth from onboarding — it is collected before the account exists now.
- [ ] 5.3 Show gender on the profile when provided.
- [ ] 5.4 Terms and privacy links at the point of acceptance.

## 6. Never display the date of birth

- [ ] 6.1 Remove `dob` from the public-profile response.
- [ ] 6.2 Confirm no interface renders it.

## 7. Tests

- [ ] 7.1 Under-18 rejected on the email path; no user row is created.
- [ ] 7.2 Under-18 rejected on the Google path; **no user row is created** — the defect this
  change exists to prevent.
- [ ] 7.3 Exactly 18 today is accepted; one day short is rejected.
- [ ] 7.4 Google sign-in with no existing account creates nothing and directs to signup.
- [ ] 7.5 Google linking from settings still works.
- [ ] 7.6 Consent is written with the account, and carries the version.
- [ ] 7.7 A version bump re-prompts; an unchanged version does not.
- [ ] 7.8 An expired pending record cannot create an account.
- [ ] 7.9 The public profile response contains no `dob`.
- [ ] 7.10 Auth matrix for any new endpoint: one positive, one negative.

## 8. Docs

- [ ] 8.1 `ops/data-map.md` — consent and pending-signup records as new locations; **correct the
  minors framing**, which is only safe to change once this ships.
- [ ] 8.2 `spec/decisions/03_flows.md` — the split signup and sign-in flows.
- [ ] 8.3 CHANGELOG.

## 9. After merge

- [ ] 9.1 Delete all users in both environments. No backfill, no accounts of unknown age.
- [ ] 9.2 Create the terms and privacy documents at version 1 (content from #81).
- [ ] 9.3 Re-create the maintainer accounts through the new flow — which also exercises it.
