## MODIFIED Requirements

### Requirement: completeOnboarding accepts username, displayName, and language
The `POST /api/v1/auth/complete-onboarding` endpoint SHALL accept an optional `username` (3-30 chars, `/^[a-z0-9_]+$/`), optional `displayName` (1-255 chars), and optional `language` (`'EN' | 'MR'`). All three fields are optional individually. If `username` is provided, it SHALL be validated for uniqueness before the update is applied. If a duplicate username is submitted, the endpoint SHALL return 409 with error code `DUPLICATE_ENTITY`.

#### Scenario: Complete onboarding with all fields
- **WHEN** an authenticated user POSTs `{ username: "dev_user", displayName: "Dev User", language: "MR" }` to `/api/v1/auth/complete-onboarding`
- **THEN** the user record is updated with all three fields and `onboardingCompletedAt` is set

#### Scenario: Complete onboarding with partial fields
- **WHEN** an authenticated user POSTs `{ language: "EN" }` to `/api/v1/auth/complete-onboarding`
- **THEN** only `language` is updated; `username` and `displayName` remain unchanged

#### Scenario: Duplicate username rejected
- **WHEN** a user submits a `username` that is already taken by another user
- **THEN** the endpoint returns 409 with error code `DUPLICATE_ENTITY`

## ADDED Requirements

### Requirement: Username availability check endpoint
The system SHALL expose `GET /api/v1/auth/check-username?username=<value>` returning `{ data: { available: boolean } }`. No authentication required. The check SHALL be case-insensitive (usernames are stored lowercase).

#### Scenario: Available username returns true
- **WHEN** `GET /api/v1/auth/check-username?username=newuser` is requested and no user has that username
- **THEN** the response is `{ data: { available: true } }`

#### Scenario: Taken username returns false
- **WHEN** `GET /api/v1/auth/check-username?username=existinguser` is requested and a user has that username
- **THEN** the response is `{ data: { available: false } }`

#### Scenario: Invalid username format returns false
- **WHEN** `GET /api/v1/auth/check-username?username=bad username!` is requested
- **THEN** the response is `{ data: { available: false } }` (invalid format is treated as unavailable)

### Requirement: Signup page collects displayName, username, language
The signup page (`/signup`) SHALL collect: display name (required), username with live uniqueness check (required), email (required), password (required, 8+ chars with letter+digit), language preference EN/MR (required radio), and show a password strength indicator (weak/ok/strong). All labels and validation messages SHALL use next-intl strings from the `auth` namespace.

#### Scenario: Username live check debounced
- **WHEN** a user types in the username field and pauses for 400ms
- **THEN** the frontend calls `GET /api/v1/auth/check-username` and displays "Username taken" or "Username available" inline

#### Scenario: Signup form submits correct payload
- **WHEN** all fields are valid and the form is submitted
- **THEN** the frontend calls `POST /api/v1/auth/register` with `{ email, password, displayName, username, language }`

### Requirement: Auth pages use next-intl strings
All frontend auth pages (login, signup, forgot-password, reset-password, verify-email) SHALL have zero hardcoded English strings in JSX. All user-visible text SHALL come from `useTranslations('auth')` hook calls with keys in `messages/en.json` and `messages/mr.json`.

#### Scenario: Login page renders in English
- **WHEN** the user's language preference is EN
- **THEN** the login page shows English labels from the `auth` namespace

#### Scenario: Login page renders in Marathi
- **WHEN** the user's language preference is MR
- **THEN** the login page shows Marathi labels from the `auth` namespace
