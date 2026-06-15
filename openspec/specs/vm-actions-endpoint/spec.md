# vm-actions-endpoint Specification

## Purpose
TBD - created by archiving change actions-guidance. Update Purpose after archive.
## Requirements
### Requirement: VM actions aggregation endpoint

The system SHALL expose `GET /api/v1/vm-actions`, authenticated via session guard, returning the requesting Vratmitra's pending items aggregated from live persisted state, **strictly scoped** to journeys the requester is assigned to as journey VM or oversees as global VM. The response SHALL group items into the four screen-spec-5 sections — `closureRequests`, `journeyCompletionRequests`, `suggestionStatusUpdates` (read-only), `customErcReviewStatus` (read-only) — and SHALL include a `counts` summary with a per-section count and a `total`. Items SHALL be grouped/labeled by the originating Vratarthi. Scope SHALL be computed from persisted active `JourneyVmAssignment` and `VmRelationship` records, never from a client-supplied identifier.

#### Scenario: assigned VM sees pending closure and completion requests

- **WHEN** an authenticated VM assigned to a journey calls `GET /api/v1/vm-actions` while that journey has an ERC item in `SUBMITTED` state and a journey-completion submission awaiting approval
- **THEN** the submitted ERC item appears under `closureRequests` and the journey appears under `journeyCompletionRequests`, each labeled with the originating VA

#### Scenario: VM does not see items from journeys they are not assigned to

- **WHEN** a VM calls `GET /api/v1/vm-actions` and a journey they are NOT assigned to has a submitted ERC item awaiting approval
- **THEN** that item is absent from the response

#### Scenario: global VM sees items across all their VA's journeys

- **WHEN** a global VM calls `GET /api/v1/vm-actions`
- **THEN** the response aggregates pending items across every journey of every VA for whom they hold an active global VM relationship

#### Scenario: user with no VM assignments receives empty queue

- **WHEN** an authenticated user with no active VM assignment calls `GET /api/v1/vm-actions`
- **THEN** every section is an empty array and `counts.total` is `0`

#### Scenario: unauthenticated request is rejected

- **WHEN** a request to `GET /api/v1/vm-actions` carries no valid session
- **THEN** the system responds `401` and returns no data

