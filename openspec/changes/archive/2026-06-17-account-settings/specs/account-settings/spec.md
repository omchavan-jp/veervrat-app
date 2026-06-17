## ADDED Requirements

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
