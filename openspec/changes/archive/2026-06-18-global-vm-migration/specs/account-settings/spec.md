## ADDED Requirements

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
