## 0. Read first

- [x] 0.1 `design.md` decision 1 — *which flow* travels in `state`, *what was typed* never does.
  Everything else follows from that split, and getting it wrong puts an email address in Google's
  logs to save one field of retyping.
- [x] 0.2 The comment above `reauthed` in `settings/page.tsx`, and the 2026-08-29 fix it records.
  Restoring intent must not reintroduce a page that claims "verified" from a URL that never
  expires — that defect signed people out for mistyping their own password.

## 1. Carry the flow through the round trip

- [x] 1.1 `GoogleOAuthGuard`: `intent=reauth` plus a `flow` parameter produces `state`
  `reauth:<flow>`, from a fixed allowlist. An absent or unrecognised flow keeps today's behaviour.
- [x] 1.2 Callback: parse `reauth:<flow>`, match against the allowlist, and redirect to
  `/settings?reauth=<outcome>&flow=<flow>`. **Ignore anything not on the list** — `state` returns
  from Google and must not be able to put an arbitrary value on the page.
- [x] 1.3 Tests for the guard and the callback, including a `state` that is not on the allowlist.

## 2. Keep what was typed

- [x] 2.1 Write the email draft to `sessionStorage` when leaving for Google; restore and clear it
  on return. Every access wrapped — private windows and blocked site data throw.
- [x] 2.2 Clear the draft on a successful change, so nothing stale is restored into a later flow.
- [x] 2.3 A password is never stored. Accounts with a password do not take this path.

## 3. Return to the flow

- [x] 3.1 On return with `flow=delete`, reopen the delete dialog; with `flow=email`, focus the
  email section.
- [x] 3.2 Show the outcome **inside** the flow — verified, or verified as the wrong account.
- [x] 3.3 `wrong_account` returns to the same place and says what happened, rather than being
  silent as it is today.
- [x] 3.4 The `reauthed` state is still read once and still cleared when the server says the proof
  is stale. Assert this, because it is the thing most likely to be broken by this change.

## 4. Copy

- [x] 4.1 New strings in `en.json` and `mr.json`, parity check passing.
- [x] 4.2 ⚠️ Marathi written by a non-speaker — add to the pack in
  `ops/marathi-policy-review.md` Part 2, which exists for exactly this.
  Done 2026-09-01: `settings.reauthWrongAccount` added as ui — block 10.

## 5. Verify like a person

- [x] 5.1 On a deployed environment, with a Google-only account: begin a delete, verify, and
  confirm you land back in the dialog. Then begin an email change, type an address, verify, and
  confirm the address is still there.
- [x] 5.2 Verify with a **different** Google account and confirm you are told so, in the flow.
  Done 2026-09-01 on UAT — **and it failed the first time, which is the point of doing it.**
  The redirect was right (`?reauth=wrong_account&flow=email`) and nothing authorised, but no
  message was visible. Reported as "no notification or on-screen error whatsoever".

  The message was being set correctly. Two things hid it, and neither is visible from a test:

  - `AccountSection` is the **last of seven sections**, and a redirect lands the reader at the top
    of the page — so it rendered entirely below the fold.
  - It was styled `text-muted`, a grey hint, because that same line also carries "we have sent a
    confirmation". A refusal read as a note.

  The delete flow passed on the first attempt because a dialog is prominent and focus-trapped by
  construction. An inline form is not, and the difference was invisible until somebody looked.

  Fixed: the message carries a tone so a refusal renders as one, and the section scrolls itself
  into view on return. Re-verify.
- [x] 5.3 Confirm the address never appears in the URL at any point in the round trip.

⚠️ 5.1–5.3 need a Google-only account on a deployed environment. An account with a password never
takes this path, so testing as one proves nothing.
