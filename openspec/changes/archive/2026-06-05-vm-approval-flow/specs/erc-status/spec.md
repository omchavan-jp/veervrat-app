## MODIFIED Requirements

### Requirement: ERC status transitions
`PATCH /api/v1/journeys/:id/exposures/:eid/status` SHALL update the status of a journey ERC item following the defined state machine.

#### Scenario: POSITIVE — VA starts an exposure (NOT_STARTED → IN_PROGRESS)
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid/status { status: "in_progress" }` is called by the journey owner
- **AND** current status is NOT_STARTED
- **THEN** status SHALL become IN_PROGRESS and startedAt SHALL be set to now
- **THEN** the response SHALL return the updated item (200)

#### Scenario: POSITIVE — VA submits exposure for closure (IN_PROGRESS → SUBMITTED)
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid/status { status: "submitted" }` is called by the journey owner
- **AND** current status is IN_PROGRESS
- **THEN** status SHALL become SUBMITTED and submittedAt SHALL be set to now

#### Scenario: POSITIVE — VA self-approves when no VM assigned (SUBMITTED → APPROVED)
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid/status { status: "approved" }` is called by the journey owner
- **AND** current status is SUBMITTED
- **AND** no active journey VM assignment exists
- **THEN** status SHALL become APPROVED and approvedAt SHALL be set to now

#### Scenario: NEGATIVE — VA cannot self-approve when VM is assigned
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid/status { status: "approved" }` is called by the journey owner
- **AND** an active journey VM assignment exists
- **THEN** the response SHALL return 403 (approval belongs to VM)

#### Scenario: NEGATIVE — VA cannot set REVISIT via the PATCH /status route
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid/status { status: "revisit" }` is called by the journey owner (VA)
- **THEN** the response SHALL return 403 (REVISIT is a VM-only action via POST .../revisit)

#### Scenario: NEGATIVE — invalid transition
- **WHEN** status update attempts an invalid transition (e.g. NOT_STARTED → APPROVED)
- **THEN** the response SHALL return 409 with error `INVALID_ERC_STATUS_TRANSITION`

#### Scenario: NEGATIVE — deactivated item cannot change status
- **WHEN** `PATCH .../status` is called on an item where `isDeactivated = true`
- **THEN** the response SHALL return 409 with error `INVALID_ERC_STATUS_TRANSITION`

#### Scenario: NEGATIVE — non-owner cannot update status
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid/status` is called by a different VA
- **THEN** the response SHALL return 403
