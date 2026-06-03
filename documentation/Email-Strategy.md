# Email Strategy — v1

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

## New packages required

Add to `apps/api/package.json`:
- `resend` — Resend SDK
- `@react-email/components` — email component library
- `react` + `react-dom` — React Email rendering (server-side only)

Add to `documentation/Platform-Engineering-Standard.md`:

| Concern | Library |
|---|---|
| Email provider | Resend SDK (`resend`) |
| Email templates | React Email (`@react-email/components`) |
