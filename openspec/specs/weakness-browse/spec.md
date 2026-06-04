## ADDED Requirements

### Requirement: List weaknesses grouped by cluster
`GET /api/v1/weaknesses` SHALL return all weaknesses grouped by cluster (A, B, C), each with name (EN + MR), description, and per-weakness stats (tests taken by the requesting user, active journey count for that user).

#### Scenario: Authenticated VA fetches weakness list
- **WHEN** `GET /api/v1/weaknesses` is called with a valid session
- **THEN** the response SHALL contain `{ data: { clusters: [ { label, weaknesses: [...] } ] } }`
- **THEN** each weakness entry SHALL include `id`, `nameEn`, `nameMr`, `description`, `category`, `stats.testsTaken`, `stats.hasActiveJourney`

#### Scenario: Unauthenticated request fetches weakness list
- **WHEN** `GET /api/v1/weaknesses` is called without a session cookie
- **THEN** the response SHALL return 200 with weakness list (guest-accessible browse)
- **THEN** `stats` fields SHALL be omitted or zeroed (no user context)

#### Scenario: Weaknesses browser groups by cluster label
- **WHEN** the WeaknessBrowser page renders
- **THEN** weaknesses SHALL be displayed in three sections: A (Identity & Self-Perception), B (Will/Effort/Relating), C (Action & Engagement)
- **THEN** each card SHALL show: weakness number, name EN + Devanagari, description excerpt

### Requirement: Why study weaknesses modal
The "Why study weaknesses?" modal SHALL be accessible from the weakness browser, weakness detail, and test entry screen. It explains virtue-first philosophy.

#### Scenario: Modal opens from browser
- **WHEN** the user clicks the "Why study weaknesses?" link/icon on the browser page
- **THEN** a modal SHALL appear with virtue-first philosophy explanation and sadgunachi upasana meaning
- **THEN** the modal SHALL be dismissible without navigating away
