## ADDED Requirements

### Requirement: Framework onboarding page introduces the Veervrat framework in two sections
The system SHALL present a full-screen focused framework onboarding page at `/onboarding/framework`. The page SHALL contain Section 1 (What is Veervrat — philosophy, "Our stance" card, VM philosophy note) and Section 2 (Process Chart — 4-stage model: Recognition → Study → Practice → Integration). The user SHALL be able to navigate forward and backward between sections. The page SHALL NOT display the application sidebar or header navigation.

#### Scenario: User navigates forward through both sections
- **WHEN** a user arrives at `/onboarding/framework`
- **THEN** Section 1 is shown first; a "Next" button advances to Section 2; a "Back" button returns to Section 1

#### Scenario: Final CTA screen is shown after Section 2
- **WHEN** a user advances past Section 2
- **THEN** the system SHALL display a final screen with the question "Ready to take your first test?" and two buttons: "Take a test now" and "Explore the app first"

#### Scenario: "Take a test now" routes to study flow
- **WHEN** a user clicks "Take a test now"
- **THEN** the system SHALL redirect to `/study` (weakness browser)

#### Scenario: "Explore the app first" routes to dashboard
- **WHEN** a user clicks "Explore the app first"
- **THEN** the system SHALL redirect to `/dashboard`

#### Scenario: User cannot skip sections by URL manipulation
- **WHEN** a user navigates directly to `/onboarding/framework` without having completed account-setup (onboardingCompletedAt is null)
- **THEN** the system SHALL redirect to `/onboarding/account-setup`
