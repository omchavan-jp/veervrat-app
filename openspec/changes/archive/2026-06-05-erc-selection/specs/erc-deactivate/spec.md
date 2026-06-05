## ADDED Requirements

### Requirement: Deactivate and reactivate ERC items
`POST /api/v1/journeys/:id/exposures/:eid/deactivate` and `.../reactivate` SHALL toggle the isDeactivated flag. Deactivated items remain visible (greyed out) but cannot have status updated.

#### Scenario: POSITIVE — VA deactivates an exposure
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/deactivate` is called by the journey owner
- **THEN** isDeactivated SHALL become true
- **THEN** the response SHALL return the updated item (200)

#### Scenario: POSITIVE — VA reactivates a deactivated exposure
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/reactivate` is called by the journey owner
- **AND** the item is currently deactivated
- **THEN** isDeactivated SHALL become false

#### Scenario: NEGATIVE — non-owner cannot deactivate
- **WHEN** `POST /api/v1/journeys/:id/exposures/:eid/deactivate` is called by a different VA
- **THEN** the response SHALL return 403

### Requirement: Permanently remove ERC item
`DELETE /api/v1/journeys/:id/exposures/:eid` SHALL permanently remove the JourneyExposure row.

#### Scenario: POSITIVE — VA removes a deactivated exposure
- **WHEN** `DELETE /api/v1/journeys/:id/exposures/:eid` is called by the journey owner
- **THEN** the JourneyExposure row SHALL be deleted
- **THEN** the response SHALL return 204

#### Scenario: NEGATIVE — non-owner cannot remove
- **WHEN** `DELETE /api/v1/journeys/:id/exposures/:eid` is called by a different VA
- **THEN** the response SHALL return 403
