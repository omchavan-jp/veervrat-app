## ADDED Requirements

### Requirement: Creator can edit a custom ERC item before submission
The system SHALL allow the creator of a custom ERC item (VA or VM who created it) to edit it via `PATCH /api/v1/journeys/:id/exposures/:eid` (and equivalents for resolutions and challenges), provided the item has status `NOT_STARTED` or `IN_PROGRESS` (pre-submission). Editing a pool-sourced item (isCustom: false) via this endpoint SHALL be rejected with 403. Editing after `SUBMITTED` status SHALL be rejected with 403.

#### Scenario: POSITIVE — creator VA edits a custom exposure pre-submission
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid` is called by the VA who created the custom item
- **AND** the item has `isCustom: true` and status `NOT_STARTED` or `IN_PROGRESS`
- **AND** the request body contains valid fields to update (`titleEn`, `descriptionEn`, `tier`)
- **THEN** the item's fields SHALL be updated
- **THEN** the response SHALL return the updated item (200)

#### Scenario: POSITIVE — creator VM edits their own custom resolution pre-submission
- **WHEN** `PATCH /api/v1/journeys/:id/resolutions/:eid` is called by the VM who created the custom item
- **AND** the item has `isCustom: true` and status `NOT_STARTED` or `IN_PROGRESS`
- **THEN** the item's fields SHALL be updated
- **THEN** the response SHALL return the updated item (200)

#### Scenario: AUTH MATRIX NEGATIVE — non-creator cannot edit
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid` is called by a user who did NOT create the item
- **THEN** the response SHALL return 403

#### Scenario: AUTH MATRIX NEGATIVE — cannot edit a pool item
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid` is called on an item where `isCustom: false`
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — cannot edit after submission
- **WHEN** `PATCH /api/v1/journeys/:id/exposures/:eid` is called on a custom item with status `SUBMITTED` or `APPROVED`
- **THEN** the response SHALL return 403
