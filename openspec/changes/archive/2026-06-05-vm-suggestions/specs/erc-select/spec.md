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
