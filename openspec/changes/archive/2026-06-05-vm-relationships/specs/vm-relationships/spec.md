## ADDED Requirements

### Requirement: Global VM relationship is created on invitation acceptance
When a VM_GLOBAL invitation is accepted, a `VmRelationship` record SHALL be created with state ACTIVE. Only one active global VM is allowed per VA at a time.

#### Scenario: Active global VM relationship is created on acceptance
- **WHEN** a VM_GLOBAL invitation is accepted
- **THEN** a `VmRelationship` row is created: `vratarthiId = inviter.id`, `vmId = invitee.id`, `state = ACTIVE`, `acceptedAt = now`

#### Scenario: VA cannot have two active global VMs simultaneously
- **WHEN** a VA already has an ACTIVE `VmRelationship` and a second VM_GLOBAL invitation is sent
- **THEN** `POST /api/v1/invitations` returns 409 `PENDING_GLOBAL_VM_INVITE_EXISTS` (enforced at send time, not accept time)

### Requirement: VA can remove their global VM
A VA SHALL be able to remove their active global VM. The system SHALL return a migration payload listing all journey assignments that were using this VM so the VA can decide what to do with each.

#### Scenario: VA removes global VM and gets migration payload
- **WHEN** a VA sends `DELETE /api/v1/vm-relationships/global`
- **THEN** the `VmRelationship` row is soft-ended (`endedAt = now`, `state` set to ended), response is 200 with `{ removedVmId, removedVmDisplayName, affectedJourneys: [{ journeyId, journeyTitle }] }` listing all ACTIVE journey assignments for this VM on this VA's journeys

#### Scenario: VA with no active global VM cannot remove
- **WHEN** a VA sends `DELETE /api/v1/vm-relationships/global` without an active `VmRelationship`
- **THEN** response is 404

#### Scenario: Non-VA cannot remove global VM
- **WHEN** a non-VA user sends `DELETE /api/v1/vm-relationships/global`
- **THEN** response is 403

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
