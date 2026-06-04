## ADDED Requirements

### Requirement: Pause and resume journey
`PATCH /api/v1/journeys/:id/state` SHALL allow a VA to pause (ACTIVE→PAUSED) or resume (PAUSED/DORMANT→ACTIVE) their own journey.

#### Scenario: POSITIVE — VA pauses active journey
- **WHEN** `PATCH /api/v1/journeys/:id/state { action: "pause" }` is called by the journey owner
- **AND** the journey is in ACTIVE state
- **THEN** the journey state SHALL become PAUSED and `pausedAt` SHALL be set to now
- **THEN** the response SHALL return the updated journey (200)

#### Scenario: POSITIVE — VA resumes paused journey
- **WHEN** `PATCH /api/v1/journeys/:id/state { action: "resume" }` is called by the journey owner
- **AND** the journey is in PAUSED or DORMANT state
- **THEN** the journey state SHALL become ACTIVE, `pausedAt` and `dormantSince` SHALL be cleared
- **THEN** the response SHALL return the updated journey (200)

#### Scenario: NEGATIVE — invalid transition (pause a non-active journey)
- **WHEN** `PATCH /api/v1/journeys/:id/state { action: "pause" }` is called on a PAUSED or COMPLETED journey
- **THEN** the response SHALL return 409 with error `INVALID_STATE_TRANSITION`

#### Scenario: NEGATIVE — other VA cannot pause journey
- **WHEN** `PATCH /api/v1/journeys/:id/state` is called by a different VA
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — unauthenticated request
- **WHEN** `PATCH /api/v1/journeys/:id/state` is called without a session
- **THEN** the response SHALL return 401
