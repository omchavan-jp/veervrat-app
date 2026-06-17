# Proposal: Account settings

## Why

Item 32 of `documentation/03_Implementation-Order.md`. There is no settings page — users
cannot change their password, email, privacy/notification preferences, or delete their
account. `spec/26` defines six sections; the infrastructure for four exists today, and this
item delivers those plus forward-compatible storage for notification preferences.

## Scope decision (recorded)

`spec/26` has 6 sections. This item builds **four fully** (Profile, Privacy, Language,
Account) **plus** notification-preference *storage + UI* (Section 4), and **defers Section 5
(Vratmitra settings)** because its backing infrastructure does not exist:

- **Notification email delivery** — `spec/25` specs per-event email + opt-out, but Item 18
  built notifications **in-app only** (`EmailModule.sendNotification` is never called). We
  store the opt-out preferences now (forward-compatible); they take effect when delivery is
  built. Recorded as a Deferral-Ledger gap (spec'd, not implemented, not in the order file).
- **Global-VM change/migration** (Section 5) — `spec/04`/`spec/26` reference a "migration UI"
  but the cascade rules are **undecided** (Item 14 left "decide what to cascade" open). Needs
  its own spec decision + order-file item; deferred.
- **Restart tour** (Section 5) — no walkthrough-replay infra exists; deferred.

## What changes

### Database
- Migration: `User.pendingEmail` (nullable — the address awaiting confirmation during an
  email change) and `User.notificationPrefs` (JSON, default `{}` — per-event opt-out map,
  mirroring the existing `profileVisibility` pattern; missing key = email-on by default).

### Backend (NestJS)
- `PATCH /api/v1/users/me/settings` — language, `showLastActive`, `showOnlineIndicator`,
  `profilePrivate`, and `notificationPrefs` (opt-out toggles for the emailable events from
  spec/25). Privacy change re-syncs the Meili user index (existing `updateVisibility` does
  this — reuse the seam).
- `PATCH /api/v1/users/me/password` — requires `currentPassword`; bcrypt-verify then update;
  invalidates other sessions (mirrors `resetPassword`). Credential accounts only. `@Audited`
  (`auth.password_change`).
- `POST /api/v1/auth/request-email-change` — body `{ newEmail, currentPassword }`; verifies
  password, ensures email unused, stores `pendingEmail`, issues an `EMAIL_CHANGE`
  verification token (already in the enum), emails the **new** address a confirm link.
- `POST /api/v1/auth/confirm-email-change` — body `{ token }`; on valid token, moves
  `pendingEmail` → `email`, clears `pendingEmail`, marks token used. `@Audited`.
- `DELETE /api/v1/users/me` — body `{ currentPassword }` (re-auth); **reuses the Item 31
  anonymisation primitive** (PII→pseudonym, soft-delete, sessions killed, pending invites
  cancelled, content retained), then clears the caller's session cookie. `@Audited`
  (`user.self_delete`).
- `GET /api/v1/users/me/connected-accounts` + `DELETE
  /api/v1/users/me/connected-accounts/:provider` — list linked auth providers; disconnect,
  **blocked if it is the only remaining login method** (can't orphan the account).

### Frontend (Next.js)
- New `/settings` page (from the sidebar user chip) with five sections: Profile (reuses the
  existing `PATCH /users/me`), Privacy, Language, Notifications (opt-out toggles), Account
  (change password, change email, connected accounts, delete account with re-auth + confirm).
- i18n `settings.*` in en.json + mr.json at parity.

## Impact

- Touches `users` module (settings/password/delete/connected-accounts endpoints; reuses
  `AuthService` seams + the anonymisation logic — extracted to a shared service method so
  both admin-anonymise and self-delete call one implementation), `auth` module (email-change
  flow), `schema.prisma` (1 migration), new web `/settings` route + `lib/api/settings.ts`.
- New email template `EmailChangeEmail`. No new runtime dependencies.

## Non-goals (deferred — see ledger)
- Notification **email delivery** (spec/25 — owed from Item 18).
- Vratmitra settings: global-VM change/migration + restart tour (needs spec + order item).
- 2FA, session management (spec/26 explicitly v2).
