# va-actions-endpoint Specification

## Purpose
TBD - created by archiving change actions-guidance. Update Purpose after archive.
## Requirements
### Requirement: VA actions aggregation endpoint

The system SHALL expose `GET /api/v1/actions`, authenticated via session guard, returning the requesting Vratarthi's pending items aggregated from live persisted state across all journeys they own. The response SHALL group items into the five screen-spec-4 sections — `ercRevisit`, `suggestionsAwaitingDecision`, `pendingVmApprovals`, `newErcAvailable`, `journeyClosurePending` — ordered most-urgent first, and SHALL include a `counts` summary with a per-section count and a `total`. The endpoint SHALL only aggregate over journeys whose `vratarthiId` equals the requesting user; it SHALL NOT trust any client-supplied journey or user identifier.

#### Scenario: VA with pending items receives a grouped queue

- **WHEN** an authenticated VA who has an ERC item in `REVISIT`, an unacknowledged active VM sidenote, and a submitted-pending-approval item calls `GET /api/v1/actions`
- **THEN** the response `data` contains those items in `ercRevisit`, `suggestionsAwaitingDecision`, and `pendingVmApprovals` respectively, with `counts.total` equal to the number of returned items

#### Scenario: VA with nothing pending receives empty sections

- **WHEN** an authenticated VA with no pending items calls `GET /api/v1/actions`
- **THEN** every section is an empty array and `counts.total` is `0`

#### Scenario: aggregation is scoped to the caller's own journeys

- **WHEN** a VA calls `GET /api/v1/actions` while another VA has pending items on a different journey
- **THEN** the response contains only the caller's own items and never the other VA's items

#### Scenario: unauthenticated request is rejected

- **WHEN** a request to `GET /api/v1/actions` carries no valid session
- **THEN** the system responds `401` and returns no data

