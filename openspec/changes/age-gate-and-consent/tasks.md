## 0. Read first

- [x] 0.1 `spec/decisions/21_age-and-personal-attributes.md` — the decisions this implements, and
  what was rejected. Do not re-derive them.
- [x] 0.2 `design.md` here — particularly why the date of birth does not travel in the OAuth
  `state` parameter, and why consent is written in the same transaction as the account.
- [x] 0.3 `apps/api/src/modules/auth/auth.service.ts` → `handleGoogleLogin`. Three branches
  today: existing auth account, existing user by email (link), and **create**. The third is what
  changes.

## 1. Schema

- [x] 1.1 `dob` becomes non-nullable on `User`.
- [x] 1.2 `version` on the policy documents, bumped deliberately by an administrator.
- [x] 1.3 A consent record: user, document key, version, accepted-at. Unique per user, document
  and version.
- [x] 1.4 A pending-signup record: opaque id, date of birth, consent, expiry.
- [x] 1.5 Migration. No backfill — see `design.md`.

## 2. Age validation

- [x] 2.1 Server-side check of 18+ at account creation, from the date of birth.
- [x] 2.2 Applied to **both** the email path and the Google path. A gate on one is not a gate.
- [x] 2.3 Client-side check on the form for immediate feedback — never the only check.
- [x] 2.4 Date picker defaults to today minus eighteen years, and treats it as the maximum.
- [x] 2.5 Persistent hint under the field stating the age requirement, shown before any attempt.
- [x] 2.6 Disabled dates use `aria-disabled` and stay reachable — `disabled` swallows the click
  and hides them from screen readers, so the explanation never reaches the people who need it.
- [x] 2.7 Inline field error on submit, at the field. Not a toast.

## 3. Consent

- [x] 3.1 Record consent **in the same transaction** as account creation.
- [x] 3.2 Read the current version at the moment of acceptance rather than trusting the client.
  ⚠️ **Was ticked before it was true.** The server took whatever version the client sent, which
  came from a hardcoded list in the web app. Found while verifying the policy documents: the
  public CMS response does not expose `version`, so the client could not have known it. Now
  resolved server-side from the published document, and a document the client names but which
  does not exist is rejected — consent to nothing is not consent.
- [~] 3.3 Re-prompt when the accepted version is behind the current one. **Deferred to #81** —
  the documents do not exist yet, so no version can be bumped and there is nothing to re-prompt
  against. Building the prompt now would mean testing it against a document that has no content.
  The record it depends on is in place, which is the part that could not be added later.

## 4. Splitting the Google flows

- [x] 4.1 Signup: collect date of birth and consent, create a pending record, redirect with its
  identifier.
- [x] 4.2 Callback: resolve the pending record; create the account only when one exists and is
  valid.
- [x] 4.3 Sign-in: authenticate an existing account only. **Remove the create branch from this
  path**, and send an unknown user to signup.
- [x] 4.4 Leave account linking from settings unchanged — the account already exists.
- [x] 4.5 Expire and clean up pending records.

## 5. Web

- [x] 5.1 Date of birth and consent on the signup form; both Google buttons point at their own
  flow.
- [x] 5.2 Remove date of birth from onboarding — it is collected before the account exists now.
- [x] 5.3 Show gender on the profile when provided.
- [x] 5.4 Terms and privacy links at the point of acceptance — done once the documents existed.

## 6. Never display the date of birth

- [x] 6.1 ~~Remove `dob` from the public-profile response.~~ **It was never there.** Checked:
  `PublicProfileDto` carried neither `dob` nor `gender`; `dob` is on `OwnProfileDto` only, which
  is the person's own data and appropriate. The real finding was the opposite — `gender` had to
  be **added** to the public profile in order to display it.
- [x] 6.2 Confirmed: no interface renders `dob`, and the public API does not return it.

## 7. Tests

- [x] 7.1 Under-18 rejected on the email path; no user row is created.
- [x] 7.2 Under-18 rejected on the Google path; **no user row is created** — the defect this
  change exists to prevent.
- [x] 7.3 Exactly 18 today is accepted; one day short is rejected.
- [x] 7.4 Google sign-in with no existing account creates nothing and directs to signup.
- [x] 7.5 Google linking from settings still works — covered by the existing
  `auth.service.google-link.spec.ts`, which exercises the link path untouched by this change.
- [x] 7.6 Consent is written with the account, and carries the version.
- [~] 7.7 A version bump re-prompts; an unchanged version does not. **Deferred with 3.3.**
- [x] 7.8 An expired pending record cannot create an account.
- [x] 7.9 The public profile response contains no `dob`.
- [x] 7.10 Auth matrix for any new endpoint: one positive, one negative.

## 8. Docs

- [x] 8.1 `ops/data-map.md` — consent and pending-signup records as new locations; **correct the
  minors framing**, which is only safe to change once this ships.
- [~] 8.2 `spec/decisions/03_flows.md` — the split signup and sign-in flows. Recorded in
  `spec/decisions/21_age-and-personal-attributes.md` instead, which is where the decision and its
  reasoning live; duplicating it into 03 would create two places to keep in step.
- [x] 8.3 CHANGELOG.

## 9. After merge

- [ ] 9.1 Delete all users in both environments. No backfill, no accounts of unknown age.
  🛑 **NOT RUN — 2026-08-31. The condition this task exists to satisfy is already met, and running
  it now would destroy real accounts for no reason.**

  The rationale is *"no accounts of unknown age"*. Measured against both environments, restored
  from the nightly dumps:

  ```
  uat  → 0 live accounts of UNKNOWN age, out of 11
  prod → 0 live accounts of UNKNOWN age, out of 2
  ```

  Every live account carries a date of birth, and every one computes to 18 or over — the youngest
  is exactly 18, the oldest 37. The only two rows without a `dob` are already anonymised, where
  #140 clears it deliberately; their absence of a date is the deletion working, not a gap.

  So there is nothing here to delete on age grounds. What a wipe would actually remove:

  - **`shantanu` on production** — created 2026-08-27, a real person, not a test account.
  - `test_acc_1/2/3` — the three accounts #278's fix has to be verified with.
  - `nachdevl` — and the Marathi review pack is with Nachiket right now.

  ⚠️ **This task was correct when it was written.** At that point the age gate did not exist and
  accounts predating it could not have their age established; deleting rather than backfilling was
  the right call. #133 enforced 18+ at account creation on 2026-08-22, and every account in either
  environment dates from that day or later. The task outlived the condition.

  **Do not tick this — it has not been done.** It should be closed as no longer applicable, or
  re-opened deliberately if someone finds an account whose age genuinely cannot be established.
  Ticking it would record a destructive action nobody performed.

- [x] 9.2 Create the terms and privacy documents at version 1 (content from #81).
  Done, and superseded — verified 2026-08-31 in both environments. Both documents are live at
  **version 2** in English and Marathi:

  ```
  uat   privacy v2  en+mr      prod  privacy v2  en+mr
  uat   terms   v2  en+mr      prod  terms   v2  en+mr
  ```

  v1 existed and was republished at v2 on 2026-08-23, disclosing the retained Google identity
  link. The consent records show the re-prompt actually fired rather than merely shipping — one
  account consented at v1 and then again at v2, and every current account holds a v2 consent for
  both documents (13 on UAT, 2 on prod). That is the mechanism working end to end on real people,
  which is more than this task asked for.

- [ ] 9.3 Re-create the maintainer accounts through the new flow — which also exercises it.
  **Not applicable while 9.1 is not run** — there is nothing to re-create. It is also the one task
  here that cannot be done from a terminal: it needs a browser, a real inbox for the verification
  mail, and a deliberate under-18 attempt to confirm the gate refuses *before* an account exists
  rather than creating and then removing one.

  Worth keeping if 9.1 is ever revisited, because signing up again is the only thing that
  exercises the age gate and the consent capture together, by someone who has to live with the
  result.
