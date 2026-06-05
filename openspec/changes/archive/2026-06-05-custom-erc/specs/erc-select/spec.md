## MODIFIED Requirements

### Requirement: List journey ERC items
`GET /api/v1/journeys/:id/exposures` SHALL return all exposures (active + deactivated) for a journey.

#### Scenario: POSITIVE — VA lists journey exposures
- **WHEN** `GET /api/v1/journeys/:id/exposures` is called by the journey owner
- **THEN** the response SHALL return all JourneyExposures for this journey, including deactivated ones
- **THEN** each item SHALL include: id, status, isDeactivated, isCustom, createdById, titleEn, descriptionEn, tier, startedAt, submittedAt, approvedAt, reviewStatus, vmSidenote
