## ADDED Requirements

### Requirement: VA submits journey for completion
`POST /api/v1/journeys/:id/complete` SHALL allow the journey owner (VA) to signal readiness for journey completion.

#### Scenario: POSITIVE — VA self-approves journey when no VM assigned
- **WHEN** `POST /api/v1/journeys/:id/complete` is called by the journey owner
- **AND** no active journey VM assignment exists
- **THEN** the journey state SHALL become COMPLETED and completedAt SHALL be set to now
- **THEN** the response SHALL return the updated journey (200)

#### Scenario: POSITIVE — VA submits for completion when VM is assigned
- **WHEN** `POST /api/v1/journeys/:id/complete` is called by the journey owner
- **AND** an active journey VM assignment exists
- **THEN** the journey state SHALL remain unchanged (still ACTIVE)
- **THEN** a Notification row SHALL be created for the VM (eventType: JOURNEY_COMPLETION_SUBMITTED)
- **THEN** the response SHALL return 202 Accepted

#### Scenario: NEGATIVE — non-owner cannot submit for completion
- **WHEN** `POST /api/v1/journeys/:id/complete` is called by a different VA
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — VM cannot call the VA submit endpoint
- **WHEN** `POST /api/v1/journeys/:id/complete` is called by any VM
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — already completed journey cannot be submitted again
- **WHEN** `POST /api/v1/journeys/:id/complete` is called on a journey where state is COMPLETED
- **THEN** the response SHALL return 409

### Requirement: VM approves journey completion
`POST /api/v1/journeys/:id/complete/approve` SHALL allow the assigned journey VM to move the journey to COMPLETED state.

#### Scenario: POSITIVE — VM approves journey completion
- **WHEN** `POST /api/v1/journeys/:id/complete/approve` is called by the journey's active VM
- **AND** the journey state is ACTIVE
- **THEN** the journey state SHALL become COMPLETED and completedAt SHALL be set to now
- **THEN** a Notification row SHALL be created for the VA (eventType: JOURNEY_COMPLETION_APPROVED)
- **THEN** the response SHALL return the updated journey (200)

#### Scenario: NEGATIVE — VA cannot call the VM approve completion endpoint
- **WHEN** `POST /api/v1/journeys/:id/complete/approve` is called by the VA
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — non-assigned VM cannot approve completion
- **WHEN** the caller is a VM but is not the active assigned VM for this journey
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — already completed journey cannot be approved again
- **WHEN** `POST /api/v1/journeys/:id/complete/approve` is called on a journey where state is COMPLETED
- **THEN** the response SHALL return 409
