# Email Strategy — v1

> **Provider changed 2026-08-17: Resend → JP's own SMTP relay** (decision D9, implemented as
> issue, now shipped). The strategy below — categories, templates, bilingual handling — is unchanged; only the
> transport is different. Email is **live and delivering**; see "Implementation status" at the
> foot of this page for what is and is not done.

## Provider & Architecture

| Concern | Decision |
|---|---|
| Production transport | **JP IT's SMTP relay** — `dhoomketu.in:587`, STARTTLS |
| Sending identity | `Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>` |
| Local development | Console logging — no actual emails sent |
| Template engine | React Email (`@react-email/components`) — unaffected by the transport change |
| Email module | Dedicated `EmailModule` in NestJS, injectable app-wide |

**Why not Resend** (reversing the original decision): JP's relay sends as
`notifications.jnanaprabodhini.org`, a subdomain dedicated to automated mail rather than JP's
staff mail — which removes the domain-reputation risk that motivated choosing a third party in
the first place. It also drops an external account, and with it Resend's 3,000/month free-tier
ceiling, which was user-facing (exhausting it breaks signup verification and password reset).
Credentials were verified authenticating before the decision was taken, and a test message
delivered to a Gmail **inbox rather than spam** — deliverability evidence, not just config.

### ⚠️ STARTTLS, not implicit TLS

Port 587 with `TLS: true` means **STARTTLS** — the connection opens in the clear and upgrades.
In nodemailer that is:

```ts
{ host: 'dhoomketu.in', port: 587, secure: false, requireTLS: true }
```

`secure: true` means *implicit* TLS on port 465 and will fail against this server with a
confusing handshake error. This is the single most common way to misconfigure it.

The server also **rejects pipelined commands** (`554 5.5.0 Error: SMTP protocol
synchronization`) — it expects each command to await its reply. Standard SMTP clients handle
this correctly; it only bites hand-rolled connection testing.

### EmailService pattern
```
EmailService
  .sendTransactional(to, template, data)   // blocks, awaits delivery
  .sendNotification(to, template, data)    // fire-and-forget, non-blocking
```

In local dev (`NODE_ENV !== 'production'`): both methods log the rendered content to console
instead of sending. No credentials needed for dev.

---

## Email Categories

### 1. Transactional (sent immediately, synchronously, auth-critical)

These block the user flow — must succeed reliably. Never queued.

| Event | Trigger | Subject |
|---|---|---|
| Email verification | User registers with credentials | Verify your Veervrat account |
| Password reset | Forgot password request | Reset your Veervrat password |
| Email change verification | User changes email in settings | Confirm your new email address |
| Account deletion confirmation | User initiates account deletion | Confirm account deletion |

### 2. Notification emails (fire-and-forget, non-blocking)

These are secondary — failure does not affect the user's action. Sent asynchronously.

Per `spec/decisions/25_notifications.md`, these events send email by default (user can opt out per-event):

| Event | Recipient | Default email |
|---|---|---|
| VM invitation received | Invitee | ✅ |
| VM invitation accepted | VA (sender) | ✅ |
| VM invitation declined | VA (sender) | ✅ |
| VM invitation expired | VA (sender) | ✅ |
| Invitee joined platform | VA (original inviter) | ✅ |
| Journey went dormant | VA + assigned VM | ✅ |
| ERC closure submitted | Assigned VM | ✅ |
| ERC closure approved | VA | ✅ |
| ERC returned for revisit | VA | ✅ |
| Journey completion submitted | Assigned VM | ✅ |
| Journey completion approved | VA | ✅ |
| Custom ERC submitted for global review | All moderators | ✅ |
| Custom ERC approved | VA + VM (submitters) | ✅ |
| Custom ERC rejected | VA + VM (submitters) | ✅ |
| VM withdrew from assignment | VA | ✅ |

Events that are **in-app only** (no email option):
- New ERC available (weakness attached)
- VM suggestion new/dismissed
- Blog comment new
- Comment reported
- New follower
- Chat message received (configurable per-VM via chat settings)

---

## Template Strategy

### Technology: React Email

Templates are React components in `apps/api/src/modules/email/templates/`. Each template:
- Exports a React component accepting typed props
- Has both HTML and plain-text versions (React Email generates both)
- Uses only inline styles (email client compatibility)
- Is bilingual: renders in user's preferred language (EN or MR) via the `language` prop

### Template naming: `<EventName>Email.tsx`
Examples: `VerifyEmailEmail.tsx`, `PasswordResetEmail.tsx`, `VmInvitationEmail.tsx`

### Language in emails
- Transactional emails: use the language stored on the user's account (`user.language`)
- Notification emails for external invitees (not-yet-registered): send in English (no language preference known)
- Subject lines and body both localised

---

## From Address & Domain

- **From:** `Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>` — provisioned
  by JP IT 2026-08-17.
- **Reply-to:** none (do-not-reply). The mailbox is not monitored.
- **Domain / SPF / DKIM / DMARC:** **not our concern** — JP IT owns
  `notifications.jnanaprabodhini.org` and its mail records. This is a real advantage of the
  relay over a third-party sender: no DNS records for us to add, verify, or keep correct.
- Dev: identity irrelevant (console logging).

---

## Module Structure

```
apps/api/src/modules/email/
  email.module.ts
  email.service.ts          # nodemailer (SMTP) vs console abstraction
  templates/
    VerifyEmailEmail.tsx
    PasswordResetEmail.tsx
    EmailChangeEmail.tsx
    AccountDeletionEmail.tsx
    VmInvitationEmail.tsx
    VmInvitationAcceptedEmail.tsx
    VmInvitationDeclinedEmail.tsx
    VmInvitationExpiredEmail.tsx
    JourneyDormantEmail.tsx
    ErcClosureSubmittedEmail.tsx
    ErcClosureApprovedEmail.tsx
    ErcReturned ForRevisitEmail.tsx
    JourneyCompletionSubmittedEmail.tsx
    JourneyCompletionApprovedEmail.tsx
    CustomErcReviewEmail.tsx
    CustomErcApprovedEmail.tsx
    CustomErcRejectedEmail.tsx
    VmWithdrewEmail.tsx
```

---

## Rate limits

- ~~Resend free tier: 3,000/month~~ — **no longer applies** (D9). That ceiling was
  user-facing: exhausting it broke signup verification and password reset, not just
  notifications.
- ⚠️ **JP's relay limits are unknown.** Ask JP IT before any bulk send (e.g. a broadcast to all
  beta testers). Absence of a documented limit is not evidence of no limit.
- No per-user rate limiting on email in v1.
- Password reset: existing tokens are invalidated before creating a new one (already
  implemented in auth service) — prevents flooding.

---

## Required env vars

```bash
# Production only — leave unset for local dev (console logging)
SMTP_HOST="dhoomketu.in"
SMTP_PORT="587"
SMTP_SECURE="false"        # STARTTLS on 587 — true would mean implicit TLS on 465
SMTP_USER="do-not-reply-veervrat@notifications.jnanaprabodhini.org"
SMTP_PASS="<from Key Vault — never committed>"
EMAIL_FROM="Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>"
```

`RESEND_API_KEY` is gone, and so is the `resend` package.

There is no separate `SMTP_REQUIRE_TLS`: `requireTLS` is derived as the inverse of
`SMTP_SECURE`, so the two cannot be set to a contradictory pair.

**Credential handling:** the password lives in `~/.secrets/veervrat/smtp-jp.env` (mode 600,
outside the repo) as the working copy; the live value is in each environment's Key Vault. It must never enter git —
see the credential rule in `../AGENTS.md`.

## Packages

| Package | State |
|---|---|
| `nodemailer` | ✅ installed (with `@types/nodemailer`) |
| ~~`resend`~~ | ✅ removed 2026-08-17 |
| `@react-email/components` | ✅ `^0.0.36` — unaffected, renders HTML for any transport |
| `react` | ✅ `^19.0.0` |

Adding `nodemailer` requires updating `10_Platform-Engineering-Standard.md` first — approved
library catalog rule.

## Implementation status

✅ **Wired and delivering, verified 2026-08-17.** A password-reset email sent from UAT reached
an external Gmail inbox — **not** spam. That is the first email this project has ever
delivered, and it also proved the relay handles external domains, which had never been tested
(JP's own test message went to a `@jnanaprabodhini.org` address).

- ✅ `EmailModule` + `email.service.ts` with a console fallback
- ✅ Transport is **nodemailer over JP IT's relay** (2026-08-17). `resend` removed.
- ✅ 8 of the ~18 templates listed above exist (`EmailChangeEmail`, `NotificationEmail`,
  `PasswordResetEmail`, `PlatformInvitationEmail`, `VerifyEmailEmail`, …). The full list above
  is the target, not the current state
- ✅ Credentials exist and are **verified authenticating** against JP's relay (2026-08-17)
- ✅ Password in **UAT's Key Vault** as `smtp-password`, referenced by the app. Terraform owns
  the secret's existence with `ignore_changes = [value]`; the real value is set out of band, so
  an apply cannot revert it to the placeholder. **Prod's vault still holds the placeholder** —
  set it before the next prod deploy.
- ⚠️ **Verification email cannot be resent.** No such endpoint exists, and password reset does
  not mark the address verified — so a user who loses the verification mail is locked out with
  no self-service route. See issue #74.

**No longer blocked on DNS.** The old blocker (verify a sending domain, add SPF/DKIM/DMARC on
a subdomain we control) disappeared with D9: JP IT owns the sending domain and its mail
records. Nothing on the DNS side is outstanding for email.

🔴 **This gates credential signup entirely.** `auth.service.ts:148` throws
`EmailNotVerifiedException` on login when `emailVerifiedAt` is null, and only a delivered
verification email can set it. That transport now works, but an account that never received
one still **cannot recover** — see issue #74. Google OAuth bypasses this (it sets `emailVerifiedAt` on account
creation) — but prod's Google credentials are placeholders (O23), so today prod has no working
signup path at all.
