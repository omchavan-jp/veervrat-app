## MODIFIED Requirements

### Requirement: VA can remove their global VM
A VA SHALL be able to remove their active global VM, choosing how to cascade to the outgoing VM's journey assignments. The system SHALL return a migration payload listing all journey assignments that were using this VM. The cascade choice is `keep` (default — leave journey assignments intact) or `unassign` (also end the outgoing VM's journey assignments on this VA's journeys). Pending approvals (SUBMITTED items) are left untouched in both cases (spec/04). The outgoing VM SHALL be notified (`VM_WITHDREW`).

#### Scenario: VA removes global VM with default cascade (keep)
- **WHEN** a VA sends `DELETE /api/v1/vm-relationships/global` with no body (or `{ cascade: "keep" }`)
- **THEN** only the global `VmRelationship` row is soft-ended (`endedAt = now`); any `JourneyVmAssignment` rows for that VM remain ACTIVE; response is 200 with `{ removedVmId, affectedJourneys: [{ journeyId, journeyTitle }], cascade: "keep" }`

#### Scenario: VA removes global VM with unassign cascade
- **WHEN** a VA sends `DELETE /api/v1/vm-relationships/global` with `{ cascade: "unassign" }`
- **THEN** the global `VmRelationship` row AND every ACTIVE `JourneyVmAssignment` for that VM on this VA's journeys are soft-ended (`endedAt = now`); response is 200 with `cascade: "unassign"` and the affected journeys

#### Scenario: Outgoing VM is notified
- **WHEN** a VA removes (or changes) their global VM
- **THEN** the outgoing VM receives a `VM_WITHDREW` notification (and, per the notification email system, an email if they have not opted out)

#### Scenario: Pending approvals untouched on unassign
- **WHEN** `unassign` ends journey assignments that have ERC items in SUBMITTED status
- **THEN** those ERC items remain in SUBMITTED status — no auto-approval or auto-return

#### Scenario: VA with no active global VM cannot remove
- **WHEN** a VA sends `DELETE /api/v1/vm-relationships/global` without an active `VmRelationship`
- **THEN** response is 404

#### Scenario: Non-VA cannot remove global VM
- **WHEN** a non-VA user sends `DELETE /api/v1/vm-relationships/global`
- **THEN** response is 403

## ADDED Requirements

### Requirement: Global VM change is remove-plus-invite
The system SHALL implement a global VM "change" as removal (with cascade choice) followed by a fresh global VM invitation to the replacement, via the existing invitation flow. There SHALL be no silent reassignment — the incoming VM must explicitly accept (spec/04).

#### Scenario: Changing global VM requires the replacement to accept
- **WHEN** a VA changes their global VM (removes the current one, then sends a `VM_GLOBAL` invitation to a new person)
- **THEN** no new global `VmRelationship` becomes ACTIVE until the invited person accepts the invitation through the existing `POST /api/v1/invitations` + accept flow
