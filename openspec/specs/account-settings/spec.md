# account-settings Specification

## Purpose
TBD - created by archiving change account-settings. Update Purpose after archive.
## Requirements
### Requirement: Update account settings
The system SHALL allow an authenticated user to update their own language, privacy toggles
(last-active visibility, online indicator, full-profile privacy), and notification-email
opt-out preferences. A privacy change SHALL keep the search index consistent.

#### Scenario: User updates privacy and language
- **WHEN** a user PATCHes `/api/v1/users/me/settings` with `{ language, profilePrivate, showLastActive }`
- **THEN** the fields are updated and, when `profilePrivate` changed, the user search index is re-synced

#### Scenario: User sets notification opt-outs
- **WHEN** a user PATCHes `/api/v1/users/me/settings` with `notificationPrefs` opting out of an emailable event
- **THEN** the preference is stored (a missing key means email-enabled by default)

#### Scenario: Unauthenticated denied
- **WHEN** an unauthenticated request hits any `/api/v1/users/me/settings` route
- **THEN** the system returns 401

### Requirement: Change password
The system SHALL allow a credential user to change their password by supplying their current
password, and SHALL audit the change.

#### Scenario: Successful password change
- **WHEN** a user PATCHes `/api/v1/users/me/password` with correct `currentPassword` and a `newPassword`
- **THEN** the password hash is updated, the change is audited, and the user remains logged in

#### Scenario: Wrong current password
- **WHEN** the supplied `currentPassword` is incorrect
- **THEN** the system returns an invalid-credentials error and the password is unchanged

#### Scenario: Google-only account
- **WHEN** a user with no password account attempts to change password
- **THEN** the system returns a clear error indicating no credential account exists

### Requirement: Change email with verification
The system SHALL let a user request an email change (re-authenticated by password) and confirm
it via a token sent to the new address; the email SHALL only change after confirmation.

#### Scenario: Request email change
- **WHEN** a user POSTs `/api/v1/auth/request-email-change` with a free `newEmail` and correct password
- **THEN** `pendingEmail` is stored and a confirmation link is emailed to the new address

#### Scenario: New email already in use
- **WHEN** the requested `newEmail` belongs to another account
- **THEN** the system rejects the request and no pending change is stored

#### Scenario: Confirm email change
- **WHEN** the user POSTs `/api/v1/auth/confirm-email-change` with a valid token
- **THEN** the account email becomes the pending email, `pendingEmail` is cleared, and the token is consumed

### Requirement: Delete own account
The system SHALL allow a user to delete their own account after re-authentication, which
anonymises the account (PII replaced, soft-deleted, sessions invalidated, pending invitations
cancelled) while retaining their content. This SHALL be audit-logged.

#### Scenario: Self-delete with re-auth
- **WHEN** a user DELETEs `/api/v1/users/me` with their correct current password
- **THEN** the account is anonymised, all sessions are invalidated, the session cookie is cleared, and `user.self_delete` is audited

#### Scenario: Self-delete wrong password
- **WHEN** the supplied current password is incorrect
- **THEN** the system returns an invalid-credentials error and the account is unchanged

#### Scenario: Content retained
- **WHEN** a user has self-deleted
- **THEN** their journeys, tests, and experience logs still exist attributed to a pseudonym

### Requirement: Manage connected accounts
The system SHALL list a user's connected auth providers and allow disconnecting one, unless it
is the only remaining login method.

#### Scenario: List connected accounts
- **WHEN** a user GETs `/api/v1/users/me/connected-accounts`
- **THEN** their linked providers are returned

#### Scenario: Disconnect blocked when last method
- **WHEN** a user attempts to disconnect their only login method
- **THEN** the system rejects it so the account cannot be orphaned

### Requirement: Restart tour
The system SHALL allow an authenticated user to restart the contextual UI walkthrough by clearing a tour-reset flag, without resetting their onboarding completion.

#### Scenario: User restarts the tour
- **WHEN** a user sends `POST /api/v1/users/me/restart-tour`
- **THEN** `tourResetAt` is set to now and returned on the user profile; `onboardingCompletedAt` is unchanged (the user is NOT sent back through signup onboarding)

#### Scenario: Unauthenticated denied
- **WHEN** an unauthenticated request hits `/api/v1/users/me/restart-tour`
- **THEN** the system returns 401

### Requirement: Vratmitra settings section
The settings page SHALL include a Vratmitra Settings section (spec/26 §5) showing the current global VM with actions to change (migration UI with cascade choice), remove (with cascade choice), and restart the tour.

#### Scenario: VA views and manages their global VM
- **WHEN** a VA opens Settings → Vratmitra Settings
- **THEN** the current global VM (if any) is shown with Change and Remove actions; Remove/Change prompt for the cascade choice (keep vs unassign journey assignments); a Restart tour action is available

### Requirement: Edit own profile details from settings
The settings page SHALL let an authenticated user edit their display name, username,
gender, and birthdate, submitting only changed fields via `PATCH /api/v1/users/me`.
The username field SHALL show a debounced availability status (checking / available /
taken / invalid) and SHALL display a warning that the public profile URL changes when
the entered username differs from the current one; saving SHALL be blocked while the
username is taken, invalid, or still being checked. The birthdate picker SHALL not
allow future dates. All strings SHALL be bilingual (en/mr) via next-intl.

#### Scenario: Correct a wrong birthdate
- **WHEN** a user picks a new birthdate in Settings → Profile and saves
- **THEN** `PATCH /users/me` is sent with the new `dob` and the profile reflects it

#### Scenario: Username change with warning
- **WHEN** a user types a different, available username
- **THEN** an availability confirmation and a URL-change warning are shown, and saving updates the username

#### Scenario: Taken username blocks save
- **WHEN** the entered username belongs to another user
- **THEN** a "taken" status is shown and the Save action is disabled

#### Scenario: Unchanged fields not sent
- **WHEN** the user edits only the birthdate and saves
- **THEN** the PATCH body contains `dob` only

