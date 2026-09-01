## Why

**Verifying with Google drops you somewhere else, having silently thrown away what you were
doing.** Found in real use on UAT, 2026-08-26 (#208), while testing the re-authentication work.

An account with no password proves itself by signing in with Google again. That is a **full-page
round trip**: the browser leaves for Google and comes back to `/settings?reauth=ok`. Everything the
page was holding in React state goes with it.

### What the person experiences

Deleting an account:

1. Open **Delete account**. The dialog offers *Verify with Google*.
2. Click it. Leave for Google. Come back to `/settings?reauth=ok`.
3. **The dialog is gone.** The page reloaded, and nothing on screen says anything happened.
4. Reopen it. Now it reads *"You've verified with Google. You can confirm below."*

So it works — on the second attempt, if you know to make one.

### It is worse for the email change, and the issue does not say so

The email change is not a dialog. It is an inline form, and `emailForm` is component state:

```ts
const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
```

So the person types the address they want to move to, clicks *Verify with Google*, and returns to
**an empty field**. They must retype it, having been given no indication that anything was lost or
gained. Establishing that took reading the component; #208 describes only the dialog case.

### Why it survived

Because it is not broken, only unkind. The proof is correctly obtained and correctly held — the
server stamped the session, single-use and time-limited, and the second attempt succeeds. Every
test passes. The failure is entirely in what the person is told and what they have to redo, which
is the category of defect this project has been finding all along: **the backend is right and the
thing a person touches is missing.**

It lands on the two most consequential actions in settings — deleting an account, and changing the
address the account is reached at — and only ever on people who signed up with Google, who cannot
avoid the round trip because they have no password to type instead.

## What Changes

- The flow you were in **survives the round trip**, and you come back to it open, rather than to a
  settings page that looks untouched.
- What you had typed survives with it, so nothing has to be entered twice.
- Returning says plainly that the verification worked, instead of leaving you to infer it by
  reopening something.
- The `wrong_account` outcome — verifying as somebody else — returns you to the same place, and
  says what happened, rather than being equally silent.

## Impact

- `apps/web/app/(app)/settings/page.tsx` — restoring intent and draft on return.
- `apps/api/src/modules/auth/guards/google-oauth.guard.ts` and `auth.controller.ts` — carrying
  *which flow* through the OAuth `state`, on a fixed allowlist.
- Spec delta: `reauthentication` — a requirement that re-authentication return a person to what
  they were doing.

**No change to what re-authentication proves, how long the proof lasts, or that it is single-use.**
This changes only where a person lands afterwards and what they still have in front of them.
