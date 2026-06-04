## ADDED Requirements

### Requirement: List own journeys
`GET /api/v1/journeys` SHALL return a paginated list of the authenticated user's journeys (VA: own journeys; VM: journeys they are assigned to).

#### Scenario: POSITIVE — VA lists own journeys
- **WHEN** `GET /api/v1/journeys` is called by an authenticated VA
- **THEN** the response SHALL return journeys where `vratarthiId = user.id`, ordered by `updatedAt DESC`
- **THEN** each journey item SHALL include `id, title, state, sentence.textEn, weaknesses[].nameEn, updatedAt`
- **THEN** the response SHALL use cursor-based pagination

#### Scenario: NEGATIVE — unauthenticated request
- **WHEN** `GET /api/v1/journeys` is called without a session
- **THEN** the response SHALL return 401

### Requirement: Get journey detail
`GET /api/v1/journeys/:id` SHALL return full journey detail including sentence context, weakness tags, VM assignment, and ERC counts.

#### Scenario: POSITIVE — VA views own journey
- **WHEN** `GET /api/v1/journeys/:id` is called by the journey owner
- **THEN** the response SHALL include:
  - Journey metadata: id, title, state, startedAt, pausedAt, completedAt
  - Sentence: textEn, textMr, subvirtue (nameEn, nameMr), virtue (nameEn, nameMr)
  - Weaknesses: array of {id, nameEn, nameMr}
  - VM: assigned VM name/id or null
  - ERC counts: { exposures: {total, active, approved}, resolutions: {total, active, approved}, challenges: {total, active, approved} }

#### Scenario: NEGATIVE — other VA cannot view journey
- **WHEN** `GET /api/v1/journeys/:id` is called by a different VA
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — unauthenticated request
- **WHEN** `GET /api/v1/journeys/:id` is called without a session
- **THEN** the response SHALL return 401
