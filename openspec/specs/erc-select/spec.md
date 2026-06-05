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

## MODIFIED Requirements

### Requirement: ERC item list and detail include vmSidenote
The `GET /api/v1/journeys/:id/exposures` and `GET /api/v1/journeys/:id/exposures/:eid` responses (and equivalents for resolutions and challenges) SHALL include a `vmSidenote` field on each item. The field is `null` when no active sidenote exists, or an object `{ id, vmId, text, acknowledgedAt, createdAt }` when an active (non-revoked) sidenote exists.

#### Scenario: POSITIVE — ERC item with no sidenote returns vmSidenote null
- **WHEN** `GET /api/v1/journeys/:id/exposures` is called
- **AND** an exposure item has no active sidenote
- **THEN** that item's `vmSidenote` field SHALL be `null`

#### Scenario: POSITIVE — ERC item with active sidenote returns sidenote data
- **WHEN** `GET /api/v1/journeys/:id/exposures` is called
- **AND** an exposure item has an active (non-revoked) sidenote
- **THEN** that item's `vmSidenote` field SHALL include `id`, `vmId`, `text`, `acknowledgedAt`, `createdAt`

#### Scenario: POSITIVE — revoked sidenote does not appear in item response
- **WHEN** `GET /api/v1/journeys/:id/exposures` is called
- **AND** an exposure item's sidenote has `revokedAt` set
- **THEN** that item's `vmSidenote` field SHALL be `null`
