## ADDED Requirements

### Requirement: Study route wired into app navigation
The `/study` route SHALL be accessible from the app header/nav. The framework onboarding CTA "Take a test now" SHALL resolve to `/study` (currently 404).

#### Scenario: Framework CTA navigates to study browser
- **WHEN** the user clicks "Take a test now" on the framework onboarding page
- **THEN** the browser SHALL navigate to `/study`
- **THEN** the weakness browser page SHALL render

#### Scenario: Study link visible in authenticated nav
- **WHEN** an authenticated VA views the app header
- **THEN** a "Study" navigation link SHALL be present and navigate to `/study`

### Requirement: Dashboard Path card 01 shows study stats
The dashboard page SHALL display Path card 01 with weakness study statistics for the authenticated user.

#### Scenario: Path card 01 renders with stats
- **WHEN** an authenticated VA views the dashboard
- **THEN** Path card 01 ("Study your weakness") SHALL display: weaknesses explored (tested at least once), total tests taken
- **THEN** a CTA arrow SHALL navigate to `/study`
- **WHEN** the user has no tests yet
- **THEN** an empty state SHALL prompt: "Take your first test to see personalized suggestions"

#### Scenario: Sentence suggestions section
- **WHEN** an authenticated VA has at least one submitted test
- **THEN** the dashboard sentence suggestions section SHALL show the lowest-scored sentences (score 1 or 2) from the user's latest test per weakness
- **THEN** each suggestion SHALL show: sentence text, subvirtue badge, score, weakness context, "Start journey" button
