## ADDED Requirements

### Requirement: Get own full profile
The system SHALL expose `GET /api/v1/users/me` returning the authenticated user's full profile including all editable fields and privacy settings.

#### Scenario: Authenticated user fetches own profile
- **WHEN** an authenticated user calls `GET /api/v1/users/me`
- **THEN** the system returns `{ data: { id, email, displayName, username, avatarUrl, gender, dob, language, showLastActive, showOnlineIndicator, profilePrivate, createdAt, updatedAt } }` with HTTP 200

#### Scenario: Unauthenticated request to own profile
- **WHEN** a request without a valid session calls `GET /api/v1/users/me`
- **THEN** the system returns HTTP 401

### Requirement: Update own profile
The system SHALL expose `PATCH /api/v1/users/me` allowing authenticated users to update their profile fields.

#### Scenario: Valid profile update
- **WHEN** an authenticated user sends `PATCH /api/v1/users/me` with a subset of `{ displayName, username, gender, dob, language }`
- **THEN** the system updates only the provided fields and returns the full updated profile with HTTP 200

#### Scenario: Username taken by another user
- **WHEN** an authenticated user sends `PATCH /api/v1/users/me` with a `username` that is already taken by a different user
- **THEN** the system returns HTTP 409 with error `USER_USERNAME_TAKEN`

#### Scenario: Invalid username format
- **WHEN** an authenticated user sends `PATCH /api/v1/users/me` with a `username` that does not match `^[a-z0-9_]{3,30}$`
- **THEN** the system returns HTTP 422 with a validation error

#### Scenario: Unauthenticated update attempt
- **WHEN** a request without a valid session calls `PATCH /api/v1/users/me`
- **THEN** the system returns HTTP 401

### Requirement: Public profile lookup by username
The system SHALL expose `GET /api/v1/users/:username` returning a filtered public profile.

#### Scenario: Public profile of an accessible user
- **WHEN** any caller (authenticated or guest) requests `GET /api/v1/users/:username` for a user with `profilePrivate = false`
- **THEN** the system returns `{ data: { username, displayName, avatarUrl, memberSince, journeysCompleted, journeysActive, testsTaken, publicExperienceCount, lastActive?, isOnline? } }` with HTTP 200, omitting fields governed by privacy toggles

#### Scenario: Private profile
- **WHEN** any caller requests `GET /api/v1/users/:username` for a user with `profilePrivate = true`
- **THEN** the system returns HTTP 404 (not 403, to avoid existence leakage)

#### Scenario: Own profile via public route
- **WHEN** an authenticated user requests `GET /api/v1/users/:username` for their own username
- **THEN** the system returns the full public profile (same shape as any other public profile, not the /me response)

#### Scenario: Non-existent username
- **WHEN** any caller requests `GET /api/v1/users/:username` for a username that does not exist
- **THEN** the system returns HTTP 404

#### Scenario: lastActive hidden
- **WHEN** the target user has `showLastActive = false` and the caller requests their public profile
- **THEN** the response object does NOT contain a `lastActive` field (absent, not null)

#### Scenario: isOnline hidden
- **WHEN** the target user has `showOnlineIndicator = false` and the caller requests their public profile
- **THEN** the response object does NOT contain an `isOnline` field (absent, not null)

### Requirement: Username availability check
The system SHALL expose `GET /api/v1/users/check-username?username=X` returning whether a username is available.

#### Scenario: Available username
- **WHEN** any authenticated caller requests `GET /api/v1/users/check-username?username=foobar` and `foobar` is not taken and matches the regex
- **THEN** the system returns `{ data: { available: true } }` with HTTP 200

#### Scenario: Taken username
- **WHEN** any authenticated caller requests `GET /api/v1/users/check-username?username=foobar` and `foobar` is already taken
- **THEN** the system returns `{ data: { available: false } }` with HTTP 200

#### Scenario: Invalid username format
- **WHEN** any authenticated caller requests `GET /api/v1/users/check-username?username=INVALID`
- **THEN** the system returns `{ data: { available: false } }` with HTTP 200 (format invalid = not available)

#### Scenario: Own username check
- **WHEN** an authenticated user checks their own current username
- **THEN** the system returns `{ data: { available: true } }` — own username is always considered available to them
