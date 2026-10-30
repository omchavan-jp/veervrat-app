# users

## Overview

User endpoints and repository support profiles, settings, account operations and personal data export. [users.controller.ts:UsersController] [users.repository.ts:UsersRepository]

## Interface

- Session-protected routes provide profile, settings, search, password, connected-account, deletion and export operations; public profile and experience routes accept optional sessions. [users.controller.ts:UsersController]
- Visibility and email preference helpers normalize JSON maps and expose default-on checks. [profile-visibility.ts:parseVisibility] [notification-prefs.ts:parseNotificationPrefs]
- Provides own and public profiles, user search, profile/settings updates, tour restart and self-deletion. [users.service.ts:UsersService]
- [dto](./dto/README.md): DTOs define profile, settings and account request validation and public and private response shapes.

## Invariants

- Public profile selection excludes date of birth; lookups exclude deleted users and normalize usernames to lowercase. [users.repository.ts:publicProfileSelect] [users.repository.ts:findByUsername]
- Only recognized boolean preferences are retained; missing profile fields and emailable event settings default enabled. [profile-visibility.ts:isFieldVisible] [notification-prefs.ts:isEmailEnabled]
- Export endpoints are throttled; token download verifies the token and returns 404 when invalid or expired. [users.controller.ts:exportMyData] [users.controller.ts:emailExportLink] [users.controller.ts:downloadExportByToken]
- Public profiles reject private accounts and omit visibility-disabled fields; online status uses a five-minute threshold. [users.service.ts:getPublicProfile] [users.service.ts:computeIsOnline]
- Public experience listing resolves the username and returns public published logs without checking profilePrivate or the experiences profile-visibility flag. [users.service.ts:getPublicExperiences] [users.repository.ts:findIdByUsername]
- Username availability requires lowercase letters, digits or underscores, 3–30 characters; corrected birth dates must meet minimum age. [users.service.ts:checkUsernameAvailable] [users.service.ts:updateOwnProfile]
- Self-deletion requires recent authentication and retains content under a pseudonym. [users.service.ts:selfDelete] [users.service.ts:anonymiseAccount]

## Side Effects

- Profile and settings updates persist user data; anonymization removes personal fields, suspends and soft-deletes, while separate operations clear passwords and cancel pending invitations. [users.repository.ts:updateProfile] [users.repository.ts:anonymise] [users.repository.ts:clearStoredPasswords] [users.repository.ts:cancelPendingInvitations]
- Password changes set a session cookie, account deletion clears it, and export email is queued. [users.controller.ts:changePassword] [users.controller.ts:deleteAccount] [users.controller.ts:emailExportLink]
- Invokes search maintenance on initialization and profile/settings changes, but UsersIndexService maintenance is a no-op; user search reads PostgreSQL directly. [users.service.ts:onModuleInit] [users.service.ts:syncToIndex] [users.service.ts:searchUsers] [../search/users-index.service.ts:UsersIndexService]
- Anonymisation clears passwords, logs out sessions, cancels invitations and invokes the no-op search removal method; PostgreSQL user search excludes the soft-deleted row. [users.service.ts:anonymiseAccount] [../search/users-index.service.ts:UsersIndexService]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
