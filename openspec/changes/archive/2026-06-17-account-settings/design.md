# Design: Account settings

## Reusing the anonymisation primitive (no duplication)

Item 31 put anonymisation logic in `AdminUsersService.anonymise` + `AdminUsersRepository`.
Self-delete needs the *same* effect. Rather than copy it, extract the core into a shared seam:

- Move the PII-replacement + flag-setting + invite-cancellation into a method both callers
  use. Lowest-friction option: a `UsersService.anonymiseAccount(userId)` (in the users
  module, which owns the user row) that does the repo writes + `AuthService.forceLogout` +
  pending-invite cancellation, and have **both** `AdminUsersService.anonymise` (admin path,
  with its self-guard + already-anonymised check + audit) and the new self-delete call it.
- `AdminUsersService` already imports nothing from `users`; it will call
  `UsersService.anonymiseAccount`. Guard against cycles: `users` does not import
  `admin-users`, so `admin-users` → `users` is safe (add `UsersModule` to AdminUsersModule
  imports; UsersModule already exports UsersService).
- The deterministic pseudonym (uuid-slice) and "content retained" semantics are unchanged.

This keeps one implementation of "what anonymise means" and satisfies spec/06 identically for
both entry points.

## Settings endpoint

`PATCH /users/me/settings` (SessionGuard) accepts a partial DTO: `language?`,
`showLastActive?`, `showOnlineIndicator?`, `profilePrivate?`, `notificationPrefs?`. The
repository already selects these privacy fields; extend `updateProfile`/add an
`updateSettings` repo method to set them. When `profilePrivate` changes, re-sync the Meili
user index — the existing `updateVisibility` path already does this; factor the sync call so
both reuse it. No ABAC beyond "is me" (SessionGuard gives identity; the row is the caller's).

## Notification preferences

JSON map on `User.notificationPrefs`, mirroring `profile-visibility.ts`:
- A fixed allowlist of **emailable** event keys (the ✅ rows in spec/25): vm-invitation
  received/accepted/declined/expired, invitee-joined, journey-dormant,
  erc-closure-submitted/approved, erc-returned, journey-completion-submitted/approved,
  custom-erc submitted/approved/rejected, vm-withdrew. (In-app-only events are NOT togglable;
  chat is per-VM, out of scope here.)
- `parseNotificationPrefs(raw)` normalizes DB JSON → typed map (drop unknown keys / non-bool),
  exactly like `parseVisibility`. Missing key = email enabled (opt-out model). A `false`
  value means the user opted out.
- This is **storage only** this item — no delivery reads it yet (delivery is deferred).

## Password change

`PATCH /users/me/password` `{ currentPassword, newPassword }`. New
`AuthService.changePassword(userId, current, next)`: load the EMAIL auth account, `bcrypt
.compare(current)` → `InvalidCredentialsException` on mismatch, hash + `updatePasswordHash`,
then `deleteAllUserSessions` EXCEPT keep the caller logged in is not required — mirror
`resetPassword` which kills all sessions; for change-password we kill *other* sessions but
the controller re-issues the current session cookie so the user stays logged in. (Simplest
correct: kill all, re-create one session, set cookie — same as login.) Credential-only:
Google-only account → `EntityNotFoundException('AuthAccount')` surfaced as a clear 422.

## Email change (mirror reset-password)

Two steps, `EMAIL_CHANGE` token (enum already exists):
1. `POST /auth/request-email-change` `{ newEmail, currentPassword }` — verify password;
   reject if `newEmail` already belongs to another user (or equals current); set
   `pendingEmail`; invalidate prior `EMAIL_CHANGE` tokens; create a new token (metadata holds
   the new email as a cross-check); email the **new** address a
   `/confirm-email-change?token=` link via a new `EmailChangeEmail` template.
2. `POST /auth/confirm-email-change` `{ token }` — validate token + not expired; ensure the
   token's user still has that `pendingEmail`; set `email = pendingEmail`, clear
   `pendingEmail`, mark token used. (Email stays verified since the new address proved
   control by clicking; `emailVerifiedAt` retained.)

## Self-delete

`DELETE /users/me` `{ currentPassword }` (SessionGuard): verify password (re-auth), call
`UsersService.anonymiseAccount(user.id)`, clear the session cookie in the controller. Audited
`user.self_delete`. Google-only accounts: spec/06 still allows deletion — if no password
exists, require... v1: such accounts can't self-delete via this password-reauth path; surface
a clear error directing them (rare; admin-anonymise remains available). Recorded as a minor
deferral.

## Connected accounts

`GET /users/me/connected-accounts` → list `{ provider, connectedAt }` from `AuthAccount`.
`DELETE /users/me/connected-accounts/:provider` → remove that provider's AuthAccount, but
**reject if it is the only login method** (e.g. disconnecting Google when there's no EMAIL
password) → `EntityInUseException`. (Connecting Google is the existing OAuth link flow — not
re-implemented here.)

## Frontend

`/settings` (in `(app)` group, SessionGuard via the shell) with sectioned layout:
- **Profile** — reuses `PATCH /users/me` (displayName, username w/ live check, gender, dob;
  email shown read-only with a "change email" affordance).
- **Privacy** — toggles → `PATCH /users/me/settings`.
- **Language** — EN/MR radio → `PATCH /users/me/settings` (and the next-intl provider).
- **Notifications** — opt-out switches for the emailable events (with a note that delivery is
  rolling out).
- **Account** — change password form, change-email form (sends link), connected accounts
  list + disconnect, delete-account (confirm dialog + password re-auth → logout/redirect).
- Entry: the sidebar user chip links to `/settings`. New `lib/api/settings.ts` +
  `lib/api/account.ts`; query keys. React Hook Form + Zod for the credential forms.
- i18n `settings.*` en/mr parity.

## Testing

- Auth matrix / scoping: settings/password/email-change/delete all require a session (401
  unauth); a user can only act on themselves (no id param — implicitly self).
- Unit: changePassword rejects wrong current password; email-change rejects duplicate email +
  wrong password; confirm-email-change moves pending→email; self-delete calls
  anonymiseAccount + rejects wrong password; disconnect blocked when last method; settings
  parse/normalize notificationPrefs.
- Reuse-safety: AdminUsersService.anonymise still passes its existing specs after extraction.
- Web: settings sections render; forms wired.

## Non-goals (deferred onward — ledger)
- Notification email **delivery** (spec/25, owed from Item 18).
- Global-VM change/migration + restart tour (spec + order-file item needed).
- Google-only self-delete path; 2FA; session management.
