## ADDED Requirements

### Requirement: VA can create a custom ERC item in their own journey
The system SHALL allow a journey owner (VA) to create a custom exposure, resolution, or challenge within their journey via `POST /api/v1/journeys/:id/exposures/custom` (and equivalent for resolutions and challenges). The created item SHALL have `isCustom: true`, `poolExposureId: null` (no pool FK), `createdById` set to the creating user's ID, and initial status `NOT_STARTED`.

#### Scenario: POSITIVE — VA creates a custom exposure
- **WHEN** `POST /api/v1/journeys/:id/exposures/custom` is called by the journey owner (VA)
- **AND** the request body contains valid `titleEn` and optional `descriptionEn`, `tier`
- **THEN** a `JourneyExposure` SHALL be created with `isCustom: true`, `poolExposureId: null`, `createdById` = VA's user ID, `status: NOT_STARTED`
- **THEN** the response SHALL return the created item (201)

#### Scenario: POSITIVE — VA creates a custom resolution
- **WHEN** `POST /api/v1/journeys/:id/resolutions/custom` is called by the journey owner (VA)
- **AND** the request body contains valid `titleEn` and optional `descriptionEn`, `durationWeeks`, `frequencyPerWeek`, `frequencyLabel`
- **THEN** a `JourneyResolution` SHALL be created with `isCustom: true`, `poolResolutionId: null`, `createdById` = VA's user ID, `status: NOT_STARTED`
- **THEN** the response SHALL return the created item (201)

#### Scenario: POSITIVE — VA creates a custom challenge
- **WHEN** `POST /api/v1/journeys/:id/challenges/custom` is called by the journey owner (VA)
- **AND** the request body contains valid `titleEn` and optional `descriptionEn`, `durationDays`
- **THEN** a `JourneyChallenge` SHALL be created with `isCustom: true`, `poolChallengeId: null`, `createdById` = VA's user ID, `status: NOT_STARTED`
- **THEN** the response SHALL return the created item (201)

#### Scenario: POSITIVE — assigned VM creates a custom ERC item
- **WHEN** `POST /api/v1/journeys/:id/exposures/custom` is called by a VM actively assigned to the journey
- **THEN** a `JourneyExposure` SHALL be created with `isCustom: true`, `createdById` = VM's user ID
- **THEN** the response SHALL return the created item (201)

#### Scenario: AUTH MATRIX NEGATIVE — non-owner VA cannot create
- **WHEN** `POST /api/v1/journeys/:id/exposures/custom` is called by a VA who does not own this journey
- **THEN** the response SHALL return 403

#### Scenario: AUTH MATRIX NEGATIVE — non-assigned VM cannot create
- **WHEN** `POST /api/v1/journeys/:id/exposures/custom` is called by a VM not assigned to this journey
- **THEN** the response SHALL return 403
