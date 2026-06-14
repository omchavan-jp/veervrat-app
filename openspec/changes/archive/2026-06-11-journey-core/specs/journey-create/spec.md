## ADDED Requirements

### Requirement: Create journey from sentence and weakness context
`POST /api/v1/journeys` SHALL create a new journey for a sentence. The system SHALL enforce that only one non-completed journey per sentence per VA can exist at a time.

#### Scenario: POSITIVE — VA creates journey successfully
- **WHEN** `POST /api/v1/journeys { sentenceId, weaknessId }` is called by an authenticated VA
- **AND** no active/paused/dormant journey exists for that sentence for this VA
- **THEN** a Journey SHALL be created with `state=ACTIVE`, `startedAt=now`
- **THEN** a JourneyWeakness row SHALL be created linking the weakness to the journey
- **THEN** the default title SHALL be the sentence's `textEn` truncated to 100 characters
- **THEN** the response SHALL return the full journey detail (201)

#### Scenario: NEGATIVE — conflict with existing non-completed journey
- **WHEN** `POST /api/v1/journeys { sentenceId, weaknessId }` is called
- **AND** an active, paused, or dormant journey already exists for that sentence for this VA
- **THEN** the response SHALL return 409 with error `JOURNEY_ALREADY_EXISTS`
- **THEN** the response details SHALL include the existing journey's id and state

#### Scenario: NEGATIVE — unauthenticated request
- **WHEN** `POST /api/v1/journeys` is called without a session
- **THEN** the response SHALL return 401

#### Scenario: NEGATIVE — non-VA role cannot create journey
- **WHEN** `POST /api/v1/journeys` is called by a user without VRATARTHI role
- **THEN** the response SHALL return 403
