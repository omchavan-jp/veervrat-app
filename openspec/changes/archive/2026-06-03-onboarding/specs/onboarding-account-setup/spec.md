## ADDED Requirements

### Requirement: Account setup form collects required and optional profile fields
The system SHALL present an account setup page at `/onboarding/account-setup` to users whose `onboardingCompletedAt` is null. The page SHALL collect: display name (required), username (required, live uniqueness check), language preference EN/MR (required), gender (optional), and date of birth (optional).

#### Scenario: Required fields trigger validation before submit
- **WHEN** a user submits the account setup form without display name or username
- **THEN** the form SHALL display field-level validation errors and not submit

#### Scenario: Username is checked for availability in real-time
- **WHEN** a user types a username of at least 3 characters
- **THEN** the system SHALL debounce a request to `GET /auth/check-username` and display available/taken/checking status inline

#### Scenario: Username with invalid characters is rejected client-side
- **WHEN** a user enters a username containing uppercase letters or special characters other than underscore
- **THEN** the form SHALL display a validation error before submitting

#### Scenario: Successful account setup completes onboarding and redirects
- **WHEN** a user submits valid required fields (and any optional fields)
- **THEN** the system SHALL call `POST /auth/complete-onboarding`, set `onboardingCompletedAt`, and redirect to `/onboarding/framework`

#### Scenario: Username taken at submit time returns a field-level error
- **WHEN** a user submits a username that becomes taken between the live-check and form submission
- **THEN** the server returns 409 and the form SHALL display "Username already taken" on the username field

#### Scenario: Unauthenticated user accessing account setup is redirected to login
- **WHEN** an unauthenticated user navigates to `/onboarding/account-setup`
- **THEN** the system SHALL redirect to `/login`

#### Scenario: Already-onboarded user accessing account setup is redirected to dashboard
- **WHEN** a user with `onboardingCompletedAt` set navigates to `/onboarding/account-setup`
- **THEN** the system SHALL redirect to `/dashboard`
