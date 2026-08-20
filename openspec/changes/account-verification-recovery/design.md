## Context

`emailVerifiedAt` is a gate with one key and no locksmith. `verifyEmail` sets it; login checks
it; nothing else touches it. Every other flow that establishes mailbox ownership throws that
proof away.

Verified in code before designing:

- `auth.service.ts` `resetPassword` → calls `updatePasswordHash` only.
- `auth.service.ts` `linkGoogleAccount` → checks the password, links the OAuth account, creates a
  session. Never writes `emailVerifiedAt`.
- `auth.controller.ts` → no resend route exists.
- `google.strategy.ts` → maps `id`, `emails[0].value`, `displayName`. The `email_verified` claim
  is available in the profile and is currently discarded.
- `forgotPassword` → already returns `'sent'` for a missing user *and* for a Google-only account,
  which is the anti-enumeration shape to copy.

## Goals / Non-Goals

**Goals**
- Any user who can prove control of their mailbox can reach a verified state.
- No new way to discover whether an address has an account.
- No new way to send mail to an arbitrary address at will.

**Non-Goals**
- Removing or weakening the verification requirement.
- Admin-initiated verification (belongs with #40 / #75).

## Decisions

### 1. Proof of mailbox control is proof of mailbox control

A password-reset token is delivered to the address and cannot be completed without receiving it.
That is precisely what the verification link demonstrates. Accepting one and rejecting the other
is an accident of implementation order, not a security position — so `resetPassword` marks the
address verified on success.

**Considered and rejected:** leaving reset alone and relying only on the new resend endpoint. It
would leave the strictly-worse property that a user can complete a flow proving ownership and
still be told they have not proven ownership.

### 2. Trust Google's claim, but read it rather than assume it

`linkGoogleAccount` marks the address verified **only when Google's `email_verified` is true**.
Google Workspace and Gmail accounts set it; some federated identities do not. Assuming it would
mean a Google account whose address Google itself has not confirmed could verify an address here.

This requires `google.strategy.ts` to carry the claim through, since it is currently dropped.

**Note:** the link flow already requires the account's existing password, so this is two
independent proofs, not one.

### 3. The resend endpoint's contract is silence

```
POST /auth/resend-verification  { email }  →  200 { data: { status: 'sent' } }
```

Always. Address unknown → `'sent'`. Already verified → `'sent'`. Google-only account with no
credential login → `'sent'`. Only the genuine unverified-credential case actually sends.

**Why so blunt:** any observable difference — status code, body, or a timing gap wide enough to
measure — turns the endpoint into "does this person have a Veervrat account?", answerable for any
address someone cares to try. That is a worse disclosure than the inconvenience it fixes, and for
a platform used by minors it is the kind of thing that matters.

`forgotPassword` already behaves this way, so this is consistency rather than novelty.

### 4. Rate limiting is part of the feature, not an add-on

The endpoint sends mail to an address chosen by the caller. Without the strict auth throttle it
is an open relay for harassment — repeated "verify your Veervrat account" mail aimed at someone
else's inbox.

Two controls, both required:
- the strict auth throttle that already covers `login` / `signup` / `forgot-password`
- invalidating outstanding `EMAIL_VERIFICATION` tokens per request, so N requests cannot produce
  N live links to one inbox

⚠️ Related known bug: **#76** — the IP throttle currently trips before account lockout, so these
limits interact in a way that is already documented as wrong. This change must not depend on that
interaction being correct; it should be robust whichever fires first.

### 5. The error has to teach

`EmailNotVerifiedException` reaching the login screen as an unexplained failure is what turns a
recoverable state into a dead end. The user cannot know that the fix exists, so the mechanism
being present is not enough — the message must name the problem and offer the resend, in both
languages.

## Risks / Trade-offs

- **Widening what marks an address verified** is the substance of this change. Each new route is
  gated on a proof at least as strong as the original: reset requires receiving mail, Google
  linking requires both Google's confirmation and the account password.
- **A new outbound-mail endpoint is inherently abusable.** Mitigated by the throttle and token
  invalidation; the residual risk is bounded by the relay's own limits, which are unknown — see
  `19_Email-Strategy.md`.
- **Enumeration is easy to reintroduce accidentally.** An early-return added later "for clarity"
  would do it. The negative tests exist to make that a failing build rather than a silent
  regression.

## Migration Notes

None. `emailVerifiedAt` already exists and only its writers change. Existing dead accounts become
recoverable the moment this deploys — no data fix, no manual intervention, which matters because
#75 means we currently have no way to touch rows in a deployed environment anyway.
