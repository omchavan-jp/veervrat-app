# account-settings — delta spec

## ADDED Requirements

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
