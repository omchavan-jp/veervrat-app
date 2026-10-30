# settings

## Overview

Client settings page combining profile, privacy, language, notifications, global vratmitra, export, and account management sections. [apps/web/app/(app)/settings/page.tsx:SettingsPage]

## Interface

- Default export SettingsPage waits for useAuth/profile loading and renders retry UI on profile failure; it reads the current profile with usersApi.getMyProfile under queryKeys.auth.me. [apps/web/app/(app)/settings/page.tsx:SettingsPage]
- Local ProfileSection edits display name, username, gender, and date of birth; PrivacySection edits presence/privacy; LanguageSection offers EN/MR; NotificationsSection renders EMAILABLE_EVENTS. [apps/web/app/(app)/settings/page.tsx:ProfileSection] [apps/web/app/(app)/settings/page.tsx:PrivacySection] [apps/web/app/(app)/settings/page.tsx:LanguageSection] [apps/web/app/(app)/settings/page.tsx:NotificationsSection]
- Local VratmitraSection displays the GLOBAL relationship with keep/unassign removal choices and invitations navigation; DataExportSection offers download/email actions; AccountSection offers password/email changes, Google account links, and deletion. [apps/web/app/(app)/settings/page.tsx:VratmitraSection] [apps/web/app/(app)/settings/page.tsx:DataExportSection] [apps/web/app/(app)/settings/page.tsx:AccountSection]
- [data-export](./data-export/README.md): Contains documented subdirectories.

## Invariants

- Profile save sends only changed fields, lowercases username input, waits 400ms before username availability checks, and disables save unless changed username is available, required values are nonblank, and a change exists. [apps/web/app/(app)/settings/page.tsx:ProfileSection]
- splitGender maps Male/Female to canonical radio choices and other nonempty stored values to custom text; date picker maximum is today. [apps/web/app/(app)/settings/page.tsx:splitGender] [apps/web/app/(app)/settings/page.tsx:ProfileSection]
- Notification preferences default to enabled unless explicitly false; export buttons are disabled while either export action is pending. [apps/web/app/(app)/settings/page.tsx:NotificationsSection] [apps/web/app/(app)/settings/page.tsx:DataExportSection]
- Email change and deletion buttons require a password when hasPassword is true, otherwise reauthed state; REAUTHENTICATION_REQUIRED clears that state. Password update requires current password and a new password of at least eight characters. [apps/web/app/(app)/settings/page.tsx:AccountSection]
- Reauthentication restoration runs once, restores email draft only into an empty field, reopens the delete dialog for delete flow, and reports wrong_account outcomes. [apps/web/app/(app)/settings/page.tsx:AccountSection]

## Side Effects

- Profile save calls usersApi.updateMe (PATCH /users/me); privacy/language/notification controls call usersApi.updateSettings (PATCH /users/me/settings); successful saves invalidate queryKeys.auth.me. [apps/web/app/(app)/settings/page.tsx:ProfileSection] [apps/web/app/(app)/settings/page.tsx:PrivacySection] [apps/web/app/(app)/settings/page.tsx:LanguageSection] [apps/web/app/(app)/settings/page.tsx:NotificationsSection] [apps/web/lib/api/users.ts:usersApi]
- Language selection writes the lowercased NEXT_LOCALE cookie and refreshes the router before updating settings. [apps/web/app/(app)/settings/page.tsx:LanguageSection] [apps/web/lib/locale.ts:setLocaleCookie]
- Global relationship removal calls vmRelationshipsApi.removeGlobalVm (DELETE /vm-relationships/global with cascade), invalidates ["my-vms"], and navigates to /invitations for change; tour restart POSTs /users/me/restart-tour and invalidates auth profile. [apps/web/app/(app)/settings/page.tsx:VratmitraSection] [apps/web/lib/api/vm-relationships.ts:vmRelationshipsApi.removeGlobalVm] [apps/web/lib/api/users.ts:usersApi.restartTour]
- Download calls dataExportApi.download (GET /users/me/data-export), serializes JSON into a Blob, clicks a dated download link, and revokes the object URL; email action POSTs /users/me/data-export/email. [apps/web/app/(app)/settings/page.tsx:DataExportSection] [apps/web/lib/api/data-export.ts:dataExportApi]
- AccountSection invokes owned API methods for password change, forgot-password, email-change requests, connected-account listing/disconnection, and deletion; successful deletion clears React Query cache and replaces route with /login?notice=account_deleted. [apps/web/app/(app)/settings/page.tsx:AccountSection] [apps/web/lib/api/users.ts:usersApi] [apps/web/lib/api/auth.ts:authApi]
- Google verification links are built from runtime apiBaseUrl and flow; the email flow saves/takes/clears a tab sessionStorage draft, and restoration scrolls the email section into view after paint. [apps/web/app/(app)/settings/page.tsx:AccountSection] [apps/web/lib/reauth-return.ts:verifyWithGoogleUrl] [apps/web/lib/reauth-return.ts:saveEmailDraft] [apps/web/lib/reauth-return.ts:takeEmailDraft] [apps/web/lib/reauth-return.ts:clearEmailDraft]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
