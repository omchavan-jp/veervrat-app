## ADDED Requirements

### Requirement: VA or assigned VM can submit a custom ERC item for global review
The system SHALL allow the journey owner (VA) or an assigned VM to submit any custom ERC item in the journey for global dataset inclusion via `POST /api/v1/journeys/:id/exposures/:eid/submit-for-review` (and equivalents for resolutions and challenges). Submitting creates a `CustomErcReview` record with `status: pending`, sets the item's `reviewStatus` field to `'pending'`, and fires a `CUSTOM_ERC_REVIEW_REQUESTED` notification. Only custom items (`isCustom: true`) can be submitted for review. Submitting a pool item SHALL be rejected with 403. Re-submitting an item that is already pending review SHALL be rejected with 409.

#### Scenario: POSITIVE — VA submits a custom exposure for review
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/submit-for-review` is called by the journey owner (VA)
- **AND** the item has `isCustom: true` and `reviewStatus` is null (not already in review)
- **THEN** a `CustomErcReview` record SHALL be created with `entityType: EXPOSURE`, `journeyExposureId: :eid`, `status: pending`, `submittedById` = VA's user ID
- **THEN** the item's `reviewStatus` SHALL be set to `'pending'`
- **THEN** a `CUSTOM_ERC_REVIEW_REQUESTED` notification SHALL be written (recipient: system/moderator queue — recipientId is VA's own ID as a placeholder; actual moderator notification delivery is a separate concern)
- **THEN** the response SHALL return the updated item (200)

#### Scenario: POSITIVE — assigned VM submits a custom challenge for review
- **WHEN** `POST /api/v1/journeys/:id/challenges/:eid/submit-for-review` is called by an actively assigned VM
- **AND** the item has `isCustom: true` and `reviewStatus` is null
- **THEN** a `CustomErcReview` record SHALL be created and the item's `reviewStatus` set to `'pending'`
- **THEN** the response SHALL return the updated item (200)

#### Scenario: AUTH MATRIX NEGATIVE — non-participant cannot submit for review
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/submit-for-review` is called by a user who is neither the VA owner nor an assigned VM
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — pool item cannot be submitted for review
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/submit-for-review` is called on an item where `isCustom: false`
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — already-pending item cannot be re-submitted
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/submit-for-review` is called on an item where `reviewStatus` is already `'pending'`
- **THEN** the response SHALL return 409
