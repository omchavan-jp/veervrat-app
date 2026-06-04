## ADDED Requirements

### Requirement: Google OAuth conflict triggers link-pending flow
When a logged-out user initiates Google sign-in and the Google email matches an existing credentials account, the system SHALL NOT throw an error. Instead it SHALL create a short-lived link-pending token and redirect the user to the link-confirmation page.

#### Scenario: Email conflict detected during Google OAuth callback
- **WHEN** `POST /auth/google/callback` receives a Google profile whose email matches an existing `EMAIL` provider account
- **AND** no `GOOGLE` auth account exists for that `googleId`
- **THEN** the system SHALL create a `VerificationToken` of type `GOOGLE_LINK` expiring in 15 minutes with `metadata` containing `{ googleId, googleEmail, displayName }`
- **THEN** the system SHALL redirect the browser to `{FRONTEND_URL}/link-account?token=<token>`

#### Scenario: No conflict — existing Google account logs in normally
- **WHEN** `POST /auth/google/callback` receives a Google profile whose `googleId` matches an existing `GOOGLE` auth account
- **THEN** the system SHALL create a session and redirect to dashboard or onboarding as before (no change to happy path)

#### Scenario: No conflict — new Google user registers normally
- **WHEN** `POST /auth/google/callback` receives a Google profile whose email does not match any existing account
- **THEN** the system SHALL create a new user + Google auth account and session as before (no change)

### Requirement: Link-account page renders with token context
The `/link-account` page SHALL display the email address associated with the pending link and a password input.

#### Scenario: Valid token in URL
- **WHEN** the user navigates to `/link-account?token=<valid-token>`
- **THEN** the page SHALL display a form explaining that an existing Veervrat account was found for their Google email
- **THEN** the form SHALL include a password field and a submit button

#### Scenario: Missing or absent token
- **WHEN** the user navigates to `/link-account` with no `?token=` parameter
- **THEN** the page SHALL display an error state with a link back to `/login`

### Requirement: Password confirmation links Google account
`POST /auth/link-google` SHALL verify the password against the existing credentials account, create the Google `AuthAccount` record, and return a session.

#### Scenario: Correct password submitted
- **WHEN** `POST /auth/link-google { token, password }` is called
- **AND** the token is valid, unexpired, and of type `GOOGLE_LINK`
- **AND** the password matches the existing user's `passwordHash`
- **THEN** the system SHALL create an `AuthAccount` row linking `GOOGLE` provider + `googleId` to the existing user
- **THEN** the system SHALL mark the token as used
- **THEN** the system SHALL create a session cookie and return the user object
- **THEN** the frontend SHALL redirect to `/onboarding` if `onboardingCompletedAt` is null, else `/dashboard`

#### Scenario: Wrong password submitted
- **WHEN** `POST /auth/link-google { token, password }` is called
- **AND** the password does not match
- **THEN** the system SHALL return 401 with error `INVALID_CREDENTIALS`
- **THEN** the token SHALL remain valid for re-attempt until expiry

#### Scenario: Expired or used token
- **WHEN** `POST /auth/link-google { token, password }` is called
- **AND** the token has expired or `usedAt` is set
- **THEN** the system SHALL return 401 with error `TOKEN_INVALID`
- **THEN** the frontend SHALL show an error with a link to retry Google sign-in

#### Scenario: Future Google sign-in after linking
- **WHEN** the user subsequently clicks "Continue with Google" on the login page
- **THEN** `handleGoogleLogin` finds the `GOOGLE` auth account by `googleId` and logs in directly (existing happy path — no further changes needed)
