## ADDED Requirements

### Requirement: VM can approve a submitted ERC item
`POST /api/v1/journeys/:id/exposures/:eid/approve` (and identical routes for resolutions and challenges) SHALL allow the assigned journey VM to move an ERC item from SUBMITTED to APPROVED.

#### Scenario: POSITIVE — VM approves a submitted exposure
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/approve` is called by the journey's active VM
- **AND** the item status is SUBMITTED
- **THEN** status SHALL become APPROVED and approvedAt SHALL be set to now
- **THEN** a Notification row SHALL be created for the VA (eventType: ERC_CLOSURE_APPROVED)
- **THEN** the response SHALL return the updated item (200)

#### Scenario: POSITIVE — VM approves a submitted resolution
- **WHEN** `POST /api/v1/journeys/:id/resolutions/:eid/approve` is called by the journey's active VM
- **AND** the item status is SUBMITTED
- **THEN** status SHALL become APPROVED and a Notification for the VA SHALL be created

#### Scenario: POSITIVE — VM approves a submitted challenge
- **WHEN** `POST /api/v1/journeys/:id/challenges/:eid/approve` is called by the journey's active VM
- **AND** the item status is SUBMITTED
- **THEN** status SHALL become APPROVED and a Notification for the VA SHALL be created

#### Scenario: NEGATIVE — VA cannot call the VM approve endpoint
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/approve` is called by the journey owner (VA)
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — non-assigned VM cannot approve
- **WHEN** the caller is a VM but is not the active assigned VM for this journey
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — item not in SUBMITTED state
- **WHEN** `POST .../approve` is called on an item whose status is not SUBMITTED (e.g., IN_PROGRESS, APPROVED)
- **THEN** the response SHALL return 409 with error `INVALID_ERC_STATUS_TRANSITION`

#### Scenario: NEGATIVE — deactivated item cannot be approved
- **WHEN** `POST .../approve` is called on an item where `isDeactivated = true`
- **THEN** the response SHALL return 409 with error `INVALID_ERC_STATUS_TRANSITION`

### Requirement: VM can return a submitted ERC item for rework
`POST /api/v1/journeys/:id/exposures/:eid/revisit` (and identical routes for resolutions and challenges) SHALL allow the assigned journey VM to move an ERC item from SUBMITTED back to REVISIT state.

#### Scenario: POSITIVE — VM returns a submitted exposure for rework
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/revisit` is called by the journey's active VM
- **AND** the item status is SUBMITTED
- **THEN** status SHALL become REVISIT
- **THEN** a Notification row SHALL be created for the VA (eventType: ERC_RETURNED_FOR_REVISIT)
- **THEN** the response SHALL return the updated item (200)

#### Scenario: NEGATIVE — VA cannot call the revisit endpoint
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/revisit` is called by the journey owner (VA)
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — non-assigned VM cannot revisit
- **WHEN** the caller is a VM but is not the active assigned VM for this journey
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — item not in SUBMITTED state
- **WHEN** `POST .../revisit` is called on an item whose status is not SUBMITTED
- **THEN** the response SHALL return 409 with error `INVALID_ERC_STATUS_TRANSITION`
