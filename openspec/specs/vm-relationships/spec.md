## ADDED Requirements

### Requirement: Primary VM relationship is created on invitation acceptance
When a VM_GLOBAL invitation is accepted, a `VmRelationship` record SHALL be created with state ACTIVE. Only one active primary VM is allowed per VA at a time.

#### Scenario: Active primary VM relationship is created on acceptance
- **WHEN** a VM_GLOBAL invitation is accepted
- **THEN** a `VmRelationship` row is created: `vratarthiId = inviter.id`, `vmId = invitee.id`, `state = ACTIVE`, `acceptedAt = now`

#### Scenario: VA cannot have two active primary VMs simultaneously
- **WHEN** a VA already has an ACTIVE `VmRelationship` and a second VM_GLOBAL invitation is sent
- **THEN** `POST /api/v1/invitations` returns 409 `PENDING_GLOBAL_VM_INVITE_EXISTS` (enforced at send time, not accept time)

### Requirement: VA can remove their primary VM
A VA SHALL be able to remove their active primary VM, choosing how to cascade to the outgoing VM's journey assignments. The system SHALL return a migration payload listing all journey assignments that were using this VM. The cascade choice is `keep` (default — leave journey assignments intact) or `unassign` (also end the outgoing VM's journey assignments on this VA's journeys). Pending approvals (SUBMITTED items) are left untouched in both cases (spec/04). The outgoing VM SHALL be notified (`VM_WITHDREW`).

#### Scenario: VA removes primary VM with default cascade (keep)
- **WHEN** a VA sends `DELETE /api/v1/vm-relationships/global` with no body (or `{ cascade: "keep" }`)
- **THEN** only the global `VmRelationship` row is soft-ended (`endedAt = now`); any `JourneyVmAssignment` rows for that VM remain ACTIVE; response is 200 with `{ removedVmId, affectedJourneys: [{ journeyId, journeyTitle }], cascade: "keep" }`

#### Scenario: VA removes primary VM with unassign cascade
- **WHEN** a VA sends `DELETE /api/v1/vm-relationships/global` with `{ cascade: "unassign" }`
- **THEN** the global `VmRelationship` row AND every ACTIVE `JourneyVmAssignment` for that VM on this VA's journeys are soft-ended (`endedAt = now`); response is 200 with `cascade: "unassign"` and the affected journeys

#### Scenario: Outgoing VM is notified
- **WHEN** a VA removes (or changes) their primary VM
- **THEN** the outgoing VM receives a `VM_WITHDREW` notification (and, per the notification email system, an email if they have not opted out)

#### Scenario: Pending approvals untouched on unassign
- **WHEN** `unassign` ends journey assignments that have ERC items in SUBMITTED status
- **THEN** those ERC items remain in SUBMITTED status — no auto-approval or auto-return

#### Scenario: VA with no active primary VM cannot remove
- **WHEN** a VA sends `DELETE /api/v1/vm-relationships/global` without an active `VmRelationship`
- **THEN** response is 404

#### Scenario: Non-VA cannot remove primary VM
- **WHEN** a non-VA user sends `DELETE /api/v1/vm-relationships/global`
- **THEN** response is 403

### Requirement: Primary VM change is remove-plus-invite
The system SHALL implement a primary VM "change" as removal (with cascade choice) followed by a fresh primary VM invitation to the replacement, via the existing invitation flow. There SHALL be no silent reassignment — the incoming VM must explicitly accept (spec/04).

#### Scenario: Changing primary VM requires the replacement to accept
- **WHEN** a VA changes their primary VM (removes the current one, then sends a `VM_GLOBAL` invitation to a new person)
- **THEN** no new global `VmRelationship` becomes ACTIVE until the invited person accepts the invitation through the existing `POST /api/v1/invitations` + accept flow

### Requirement: Journey-level VM assignment is created on journey invitation acceptance
When a VM_JOURNEY invitation is accepted, a `JourneyVmAssignment` record SHALL be created with state ACTIVE for the specified journey.

#### Scenario: Journey VM assignment is created on acceptance
- **WHEN** a VM_JOURNEY invitation is accepted
- **THEN** a `JourneyVmAssignment` row is created: `journeyId = invitation.scopeId`, `vmId = invitee.id`, `state = ACTIVE`, `acceptedAt = now`

### Requirement: VM can withdraw from a journey assignment
A VM SHALL be able to withdraw themselves from a specific journey-level assignment. Withdrawal ends the assignment without VA action.

#### Scenario: VM withdraws from journey assignment
- **WHEN** a VM sends `DELETE /api/v1/journeys/:id/vm` for a journey they are actively assigned to
- **THEN** the `JourneyVmAssignment` row is ended (`endedAt = now`), response is 200

#### Scenario: Non-assigned VM cannot withdraw
- **WHEN** a VM sends `DELETE /api/v1/journeys/:id/vm` for a journey they are not assigned to
- **THEN** response is 403

#### Scenario: VA cannot call VM withdrawal endpoint
- **WHEN** a VA (non-VM) sends `DELETE /api/v1/journeys/:id/vm`
- **THEN** response is 403

### Requirement: Pending approvals remain untouched on VM removal
When a VM is removed from a journey (by VA or by VM self-withdrawal), ERC items in SUBMITTED state SHALL remain in SUBMITTED state. No auto-approval or auto-return occurs.

#### Scenario: Submitted ERC items remain submitted after VM removal
- **WHEN** a VM is removed from a journey that has ERC items in SUBMITTED status
- **THEN** those ERC items remain in SUBMITTED status unchanged; the VA can subsequently self-approve or revoke their submissions
