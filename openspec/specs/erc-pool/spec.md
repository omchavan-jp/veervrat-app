## ADDED Requirements

### Requirement: ERC pool filtered by journey weakness tags
`GET /api/v1/journeys/:id/exposures/pool` (and equivalents for resolutions/challenges) SHALL return pool items whose weakness tags intersect with the journey's attached weaknesses, excluding items already selected into the journey.

#### Scenario: POSITIVE — VA fetches exposure pool for journey
- **WHEN** `GET /api/v1/journeys/:id/exposures/pool` is called by the journey owner
- **THEN** the response SHALL return only exposures tagged with at least one weakness that is also in the journey's `journey_weaknesses`
- **THEN** exposures already selected into the journey (present in `journey_exposures`) SHALL be excluded
- **THEN** each item SHALL include: id, titleEn, descriptionEn, tier, weaknessTags

#### Scenario: NEGATIVE — other VA cannot see journey's ERC pool
- **WHEN** `GET /api/v1/journeys/:id/exposures/pool` is called by a different VA
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — unauthenticated request
- **WHEN** `GET /api/v1/journeys/:id/exposures/pool` is called without a session
- **THEN** the response SHALL return 401
