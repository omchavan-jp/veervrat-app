## ADDED Requirements

### Requirement: VM can suggest an ERC item by creating a sidenote
A VM assigned to a journey SHALL be able to suggest any journey ERC item (exposure, resolution, or challenge) by POSTing a sidenote with their reasoning. One sidenote per item — re-suggesting upserts (updates text, clears revokedAt, clears acknowledgedAt). Fires `VM_SUGGESTION_NEW` notification to the VA.

#### Scenario: POSITIVE — VM suggests an exposure
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/suggest { "text": "Start with this one" }` is called by an assigned VM
- **THEN** a `VmSidenote` SHALL be created (or upserted) on the item with `revokedAt: null` and `acknowledgedAt: null`
- **THEN** a `VM_SUGGESTION_NEW` notification SHALL be written to the VA
- **THEN** the response SHALL return the sidenote (200)

#### Scenario: POSITIVE — VM re-suggests (upsert) updates text and clears acknowledgement
- **WHEN** `POST .../suggest` is called again on an item that already has an active sidenote
- **THEN** the existing sidenote's `text` SHALL be updated, `revokedAt` SHALL remain null, `acknowledgedAt` SHALL be set to null
- **THEN** a `VM_SUGGESTION_NEW` notification SHALL be fired again

#### Scenario: AUTH MATRIX NEGATIVE — VA cannot suggest
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/suggest` is called by the journey owner (VA)
- **THEN** the response SHALL return 403

#### Scenario: AUTH MATRIX NEGATIVE — non-assigned VM cannot suggest
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/suggest` is called by a VM not assigned to this journey
- **THEN** the response SHALL return 403

### Requirement: VM can unsuggest (revoke sidenote)
A VM assigned to a journey SHALL be able to revoke their sidenote via DELETE. Revocation sets `revokedAt` and nullifies `acknowledgedAt` (no ghost state). Fires `VM_SUGGESTION_DISMISSED` notification to the VA. If no active sidenote exists, returns 404.

#### Scenario: POSITIVE — VM revokes a sidenote
- **WHEN** `DELETE /api/v1/journeys/:id/exposures/:eid/suggest` is called by the assigned VM
- **AND** an active (non-revoked) sidenote exists on the item
- **THEN** the sidenote's `revokedAt` SHALL be set to now
- **THEN** the sidenote's `acknowledgedAt` SHALL be set to null (acknowledgement nullified)
- **THEN** a `VM_SUGGESTION_DISMISSED` notification SHALL be written to the VA
- **THEN** the response SHALL return 204

#### Scenario: NEGATIVE — revoking when no active sidenote exists
- **WHEN** `DELETE /api/v1/journeys/:id/exposures/:eid/suggest` is called
- **AND** no active sidenote exists on the item (never suggested or already revoked)
- **THEN** the response SHALL return 404

#### Scenario: AUTH MATRIX NEGATIVE — VA cannot unsuggest
- **WHEN** `DELETE /api/v1/journeys/:id/exposures/:eid/suggest` is called by the journey owner (VA)
- **THEN** the response SHALL return 403

#### Scenario: AUTH MATRIX NEGATIVE — non-assigned VM cannot unsuggest
- **WHEN** `DELETE /api/v1/journeys/:id/exposures/:eid/suggest` is called by a VM not assigned to this journey
- **THEN** the response SHALL return 403

### Requirement: VA can acknowledge a sidenote
The journey owner (VA) SHALL be able to acknowledge a VM sidenote via POST. Sets `acknowledgedAt` to now. If no active sidenote exists, returns 404.

#### Scenario: POSITIVE — VA acknowledges a sidenote
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/sidenote/acknowledge` is called by the journey owner (VA)
- **AND** an active (non-revoked) sidenote exists on the item
- **THEN** the sidenote's `acknowledgedAt` SHALL be set to now
- **THEN** the response SHALL return the updated sidenote (200)

#### Scenario: NEGATIVE — acknowledging when no active sidenote exists
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/sidenote/acknowledge` is called
- **AND** no active sidenote exists (never suggested or already revoked)
- **THEN** the response SHALL return 404

#### Scenario: AUTH MATRIX NEGATIVE — VM cannot acknowledge
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/sidenote/acknowledge` is called by a VM
- **THEN** the response SHALL return 403

#### Scenario: AUTH MATRIX NEGATIVE — non-owner VA cannot acknowledge
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/sidenote/acknowledge` is called by a different VA
- **THEN** the response SHALL return 403
