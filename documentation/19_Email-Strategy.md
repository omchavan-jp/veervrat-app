# Email Strategy — v1

⚠️ **Under reconsideration 2026-08-17.** This doc describes the original plan (Resend). JP
offered direct SMTP on their own mail server instead (met Shantanoo 2026-08-16) — reasoning
and status in `ops/PROJECT-STATUS.md` D9/O21. **Not yet decided or implemented either way** —
the app still only speaks Resend's API today, and no SMTP creds have arrived. Don't treat this
page as current until D9 is resolved one way or the other.

## Provider & Architecture

| Concern | Decision |
|---|---|
| Production provider | Resend (`resend` SDK) |
| Local development | Console logging — no actual emails sent |
| Template engine | React Email (`@react-email/components`) |
| Email module | Dedicated `EmailModule` in NestJS, injectable app-wide |

### EmailService pattern
```
EmailService
  .sendTransactional(to, template, data)   // blocks, awaits delivery
  .sendNotification(to, template, data)    // fire-and-forget, non-blocking
```

In local dev (`NODE_ENV !== 'production'`): both methods log the rendered content to console instead of calling Resend. No env var needed for dev.

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

- **From:** `Veervrat <noreply@[sending-domain]>` — sending domain to be configured in Resend at deployment
- **Reply-to:** none (noreply)
- **Domain verification:** required in Resend before production emails send. Add SPF, DKIM, DMARC records to DNS.
- Dev: domain irrelevant (console logging)

---

## Module Structure

```
apps/api/src/modules/email/
  email.module.ts
  email.service.ts          # Resend vs console abstraction
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

## Rate & Resend Limits

- Free tier: 3,000 emails/month — monitor and upgrade before hitting limit
- No per-user rate limiting on email in v1 (Resend handles abuse at API level)
- Password reset: existing tokens are invalidated before creating a new one (already implemented in auth service) — prevents flooding

---

## Required env vars

```bash
# Production only — leave blank for local dev (uses console logging)
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="Veervrat <noreply@yourdomain.com>"
```

## Packages — ✅ already installed

Verified 2026-08-16 (this section previously read as "required to add"):

| Package | Installed |
|---|---|
| `resend` | ✅ `^4.5.2` |
| `@react-email/components` | ✅ `^0.0.36` |
| `react` | ✅ `^19.0.0` |

## Implementation status

⚠️ **Coded, not wired — nothing has ever been delivered.**

- ✅ `EmailModule` + `email.service.ts` with the Resend SDK and console fallback
- ✅ 8 of the ~18 templates listed above exist (`EmailChangeEmail`, `NotificationEmail`,
  `PasswordResetEmail`, `PlatformInvitationEmail`, `VerifyEmailEmail`, …). The full list above
  is the target, not the current state
- ❌ No Resend account, no `RESEND_API_KEY`, no verified sending domain

**Blocked on the DNS delegation (O1)** — the sending domain needs SPF/DKIM/DMARC records, and
those must go on the **subdomain**, never the root, which carries JP's live Google Workspace
mail (D9 / guardrails).

⚠️ The free tier's **3,000 emails/month is user-facing** (D18): exhausting it breaks signup
verification and password reset, not just notifications.
