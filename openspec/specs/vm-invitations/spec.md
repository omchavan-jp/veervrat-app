## ADDED Requirements

### Requirement: VA can send a VM invitation
A VA SHALL be able to invite another user to become their Vratmitra. The invitation may be global (across all journeys) or journey-scoped (for a specific journey). Sending creates an `Invitation` record with a unique token, status `PENDING`, and an expiry 7 days from creation. A notification email is sent to the invitee.

#### Scenario: VA sends a global VM invitation to an existing platform user
- **WHEN** a VA sends `POST /api/v1/invitations` with `{ type: "VM_GLOBAL", inviteeEmail: "<existing user email>" }`
- **THEN** a PENDING invitation is created with a unique token, `expiresAt = now + 7 days`, and `inviteeId` populated from the matched user; a VM invitation email is sent to the invitee; response is 201 with the invitation record

#### Scenario: VA sends a journey-scoped VM invitation
- **WHEN** a VA sends `POST /api/v1/invitations` with `{ type: "VM_JOURNEY", inviteeEmail: "...", scopeId: "<journeyId>" }` for a journey they own
- **THEN** a PENDING invitation is created with `scopeId` set to the journey ID; response is 201

#### Scenario: VA cannot send VM invitation with VM role missing
- **WHEN** a non-VA user (VM-only role) sends `POST /api/v1/invitations`
- **THEN** response is 403

#### Scenario: Only one pending global VM invite allowed at a time
- **WHEN** a VA sends a VM_GLOBAL invitation while another VM_GLOBAL invitation from them is already PENDING
- **THEN** response is 409 with error `PENDING_GLOBAL_VM_INVITE_EXISTS`

#### Scenario: VA cannot send journey VM invite for a journey they don't own
- **WHEN** a VA sends `POST /api/v1/invitations` with `scopeId` pointing to another VA's journey
- **THEN** response is 403

### Requirement: Invitee can accept a VM invitation
The invitee SHALL be able to accept a pending, non-expired VM invitation using its token. On acceptance, the corresponding VM relationship or journey assignment is created with state ACTIVE, and the invitation status is updated to ACCEPTED.

#### Scenario: Invitee accepts a valid global VM invitation
- **WHEN** the invitee sends `POST /api/v1/invitations/:token/accept` and the invitation is PENDING, not expired, and the invitee's user ID matches `inviteeId`
- **THEN** a `VmRelationship` row is created with state ACTIVE, invitation status is set to ACCEPTED with `acceptedAt = now`, response is 200

#### Scenario: Invitee accepts a valid journey-scoped VM invitation
- **WHEN** the invitee accepts a VM_JOURNEY invitation
- **THEN** a `JourneyVmAssignment` row is created with state ACTIVE for the specified journey, invitation status is ACCEPTED

#### Scenario: Token not found
- **WHEN** `POST /api/v1/invitations/:token/accept` is called with a non-existent token
- **THEN** response is 404

#### Scenario: Expired invitation cannot be accepted
- **WHEN** the token is valid but `expiresAt` is in the past
- **THEN** response is 422 with error `INVITATION_EXPIRED`

#### Scenario: Already-accepted invitation cannot be accepted again
- **WHEN** the invitation status is already ACCEPTED, DECLINED, or CANCELLED
- **THEN** response is 409 with error `INVITATION_NOT_PENDING`

#### Scenario: Wrong user cannot accept invitation
- **WHEN** an authenticated user whose ID does not match `inviteeId` sends `POST /api/v1/invitations/:token/accept`
- **THEN** response is 403

### Requirement: Invitee can decline a VM invitation
The invitee SHALL be able to decline a pending VM invitation using its token. Declining sets status to DECLINED. A notification email is sent to the VA.

#### Scenario: Invitee declines a pending invitation
- **WHEN** the invitee sends `POST /api/v1/invitations/:token/decline` for a PENDING invitation they are the invitee for
- **THEN** invitation status becomes DECLINED, a notification email is sent to the inviter VA, response is 200

#### Scenario: Wrong user cannot decline invitation
- **WHEN** a user who is not the invitee sends `POST /api/v1/invitations/:token/decline`
- **THEN** response is 403

### Requirement: VA can cancel a pending invitation
The VA who sent an invitation SHALL be able to cancel it while it is still PENDING. Cancelling sets status to CANCELLED.

#### Scenario: VA cancels their own pending invitation
- **WHEN** the VA (inviter) sends `DELETE /api/v1/invitations/:id` for an invitation they sent with status PENDING
- **THEN** invitation status becomes CANCELLED, response is 200

#### Scenario: VA cannot cancel a non-pending invitation
- **WHEN** the VA sends `DELETE /api/v1/invitations/:id` for an invitation that is already ACCEPTED, DECLINED, or EXPIRED
- **THEN** response is 409 with error `INVITATION_NOT_CANCELLABLE`

#### Scenario: VA cannot cancel another VA's invitation
- **WHEN** a VA sends `DELETE /api/v1/invitations/:id` for an invitation they did not send
- **THEN** response is 403

### Requirement: VA can list their sent invitations
A VA SHALL be able to retrieve all invitations they have sent, including their current status.

#### Scenario: VA lists their invitations
- **WHEN** a VA sends `GET /api/v1/invitations`
- **THEN** response is 200 with array of all invitations sent by that VA, ordered by `createdAt DESC`

#### Scenario: Unauthenticated request is rejected
- **WHEN** `GET /api/v1/invitations` is called without a valid session
- **THEN** response is 401
