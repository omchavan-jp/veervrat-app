# Tasks: Account settings

## 1. Schema & migration
- [x] 1.1 Add `User.pendingEmail` (nullable) + `User.notificationPrefs` (Json default `{}`)
- [x] 1.2 `prisma migrate dev` + apply to test DB + regen client; `migrate status` clean

## 2. Backend — settings + notification prefs
- [x] 2.1 `notification-prefs.ts` helper (emailable-event allowlist + parse/normalize, mirrors profile-visibility)
- [x] 2.2 `PATCH /users/me/settings` (language, privacy toggles, notificationPrefs) + repo `updateSettings`; re-sync Meili on privacy change
- [x] 2.3 DTO + service scoping (self only via SessionGuard)

## 3. Backend — anonymisation reuse + self-delete
- [x] 3.1 Extract `UsersService.anonymiseAccount(userId)` (PII→pseudonym, forceLogout, cancel pending invites); repo method
- [x] 3.2 Repoint `AdminUsersService.anonymise` to it (keep its self-guard + already-anon check + audit); verify its specs still pass
- [x] 3.3 `DELETE /users/me` (re-auth password) → anonymiseAccount + clear cookie; `@Audited user.self_delete`

## 4. Backend — password + email change
- [x] 4.1 `AuthService.changePassword(userId, current, next)` (+ controller `PATCH /users/me/password`, keep session, `@Audited`)
- [x] 4.2 `AuthService.requestEmailChange` + `POST /auth/request-email-change` (password re-auth, dup check, EMAIL_CHANGE token, email new address)
- [x] 4.3 `AuthService.confirmEmailChange` + `POST /auth/confirm-email-change` (`@Audited`)
- [x] 4.4 `EmailChangeEmail` template

## 5. Backend — connected accounts
- [x] 5.1 `GET /users/me/connected-accounts` + `DELETE :provider` (block last login method → EntityInUseException)

## 6. Tests (alongside)
- [x] 6.1 Auth: 401 unauth on all me-routes
- [x] 6.2 Unit: changePassword wrong-pw; email-change dup + wrong-pw; confirm moves pending→email; self-delete calls anonymiseAccount + wrong-pw rejects; disconnect-last blocked; notificationPrefs parse
- [x] 6.3 AdminUsersService.anonymise specs still green after extraction; full API suite green

## 7. Frontend — /settings (5 sections)
- [x] 7.1 `lib/api/settings.ts` + `account.ts` + query keys; user-chip → /settings link
- [x] 7.2 Profile (reuse PATCH /users/me), Privacy, Language, Notifications sections
- [x] 7.3 Account: change-password form, change-email form, connected accounts, delete-account (confirm + re-auth → logout)
- [x] 7.4 i18n `settings.*` en/mr parity; web tests; both prod builds pass

## 8. Verification gate & close-out
- [x] 8.1 API + web typecheck; both prod builds; full suites green
- [x] 8.2 Probe: settings update, pw-change (+wrong pw), email-change request+confirm, self-delete→anonymise (+content retained), disconnect-last blocked, 401 unauth; browser verify; console clean
- [x] 8.3 Cleanup test data
- [x] 8.4 `openspec validate` + `archive`; update Deferral Ledger (notif-email-delivery gap, global-VM-migration, restart-tour, google-only self-delete) + memory
- [x] 8.5 Merge `feat/account-settings` → dev (squash); **KEEP the branch** (do not delete)

## Deferrals recorded (ledger)
- Notification email DELIVERY — spec/25, owed from Item 18, not in order file.
- Vratmitra settings (global-VM change/migration + restart tour) — needs spec decision + new order item.
- Google-only-account self-delete path.
