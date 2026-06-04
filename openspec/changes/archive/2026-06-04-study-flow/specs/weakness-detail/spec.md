## ADDED Requirements

### Requirement: Weakness detail with subvirtues and test history
`GET /api/v1/weaknesses/:id` SHALL return weakness detail including all linked subvirtues (each with parent virtue name), test history for the requesting user, and the ID of any existing draft test.

#### Scenario: Authenticated VA fetches weakness detail
- **WHEN** `GET /api/v1/weaknesses/:id` is called with a valid session
- **THEN** the response SHALL include `id`, `nameEn`, `nameMr`, `description`, `subvirtues` (each with `nameEn`, `nameMr`, `virtue.nameEn`), `testHistory` (array of `{ id, submittedAt, answeredCount, totalSentences }`), `draftTestId` (nullable)

#### Scenario: Weakness not found
- **WHEN** `GET /api/v1/weaknesses/:id` is called with a non-existent ID
- **THEN** the response SHALL return 404

#### Scenario: Weakness detail page renders test history pills
- **WHEN** the WeaknessDetail page renders and the user has prior submitted tests
- **THEN** test history SHALL be displayed as pills (Test 1 · date, Test 2 · date, …)
- **THEN** a "Resume draft" button SHALL appear if `draftTestId` is set
- **THEN** a "Take test" button SHALL appear (or "Resume draft" replaces it when draft exists)

#### Scenario: Guest views weakness detail
- **WHEN** an unauthenticated user views the weakness detail page
- **THEN** the page SHALL render the weakness information
- **THEN** the "Take test" CTA SHALL render a soft auth prompt (or disabled state) instead of navigating to the test
