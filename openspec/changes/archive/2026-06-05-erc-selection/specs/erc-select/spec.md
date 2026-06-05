## ADDED Requirements

### Requirement: Select pool item into journey
`POST /api/v1/journeys/:id/exposures` SHALL create a JourneyExposure from a pool exposure. Duplicate selection SHALL be rejected.

#### Scenario: POSITIVE — VA selects pool exposure
- **WHEN** `POST /api/v1/journeys/:id/exposures { poolExposureId }` is called by the journey owner
- **AND** the exposure is not already selected into this journey
- **THEN** a JourneyExposure SHALL be created with status NOT_STARTED, isCustom=false, fields copied from pool
- **THEN** the response SHALL return the created JourneyExposure (201)

#### Scenario: NEGATIVE — duplicate selection
- **WHEN** `POST /api/v1/journeys/:id/exposures { poolExposureId }` is called for an already-selected exposure
- **THEN** the response SHALL return 409 with error `ERC_ALREADY_SELECTED`

#### Scenario: NEGATIVE — non-owner cannot select
- **WHEN** `POST /api/v1/journeys/:id/exposures` is called by a different VA
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — unauthenticated
- **WHEN** `POST /api/v1/journeys/:id/exposures` is called without a session
- **THEN** the response SHALL return 401

### Requirement: List journey ERC items
`GET /api/v1/journeys/:id/exposures` SHALL return all exposures (active + deactivated) for a journey.

#### Scenario: POSITIVE — VA lists journey exposures
- **WHEN** `GET /api/v1/journeys/:id/exposures` is called by the journey owner
- **THEN** the response SHALL return all JourneyExposures for this journey, including deactivated ones
- **THEN** each item SHALL include: id, status, isDeactivated, titleEn, descriptionEn, tier, startedAt, submittedAt, approvedAt
