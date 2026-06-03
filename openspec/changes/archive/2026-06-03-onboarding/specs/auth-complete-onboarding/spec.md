## MODIFIED Requirements

### Requirement: complete-onboarding endpoint accepts and persists all profile fields
The `POST /api/v1/auth/complete-onboarding` endpoint SHALL accept: `displayName` (optional string 1–255 chars), `username` (optional string 3–30 chars, lowercase alphanumeric + underscore), `language` (optional, EN or MR), `gender` (optional string, max 50 chars), and `dob` (optional ISO 8601 date string). The endpoint SHALL validate `username` uniqueness and return 409 `DUPLICATE_ENTITY` if taken by another user. On success it SHALL set `onboardingCompletedAt` to current timestamp, persist all provided fields, and return the updated `SessionUser`.

#### Scenario: Authenticated user completes onboarding with all fields
- **WHEN** an authenticated user posts valid displayName, username, language, gender, and dob to `POST /auth/complete-onboarding`
- **THEN** the system SHALL persist all fields, set `onboardingCompletedAt`, and return the updated user object with status 200

#### Scenario: Authenticated user completes onboarding with only required fields
- **WHEN** an authenticated user posts only displayName, username, and language
- **THEN** the system SHALL persist those fields, set `onboardingCompletedAt`, and return 200; gender and dob remain null

#### Scenario: Username already taken by another user returns 409
- **WHEN** an authenticated user posts a username that belongs to a different user
- **THEN** the system SHALL return 409 with error code `DUPLICATE_ENTITY`

#### Scenario: Unauthenticated request to complete-onboarding returns 401
- **WHEN** a request is made to `POST /auth/complete-onboarding` without a valid session cookie
- **THEN** the system SHALL return 401 `UNAUTHORIZED`
