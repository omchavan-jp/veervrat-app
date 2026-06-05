## Why

Vratarthis need to invite trusted users as their Vratmitras (VMs) and manage those relationships over time. Without this, the mentorship layer that underpins the entire journey workflow cannot function — ERC approval, VM suggestions, and guided completions all depend on an active VM relationship.

## What Changes

- **New**: `InvitationsModule` — send VM invitations (global or journey-scoped), accept, decline, cancel, token-based lookup; send platform invitations (invite non-users to join)
- **New**: `VmRelationshipsModule` — manage global and journey-level VM relationships (create from accepted invitation, remove/withdraw, migration payload for global VM swap)
- **New**: Email sending for invitation flows (VM invitation received, accepted, declined, expired) via existing `EmailModule`
- **New**: Email templates: `VmInvitationEmail.tsx`, `VmInvitationAcceptedEmail.tsx`, `VmInvitationDeclinedEmail.tsx`, `VmInvitationExpiredEmail.tsx`
- **Modified**: `JourneySlim` shape (used by `hasPermission`) must include `globalVmRelationship` — already present; `JourneysRepository.buildJourneySlim` must populate it from the `VmRelationship` table

## Capabilities

### New Capabilities
- `vm-invitations`: Invitation lifecycle — send (VM or platform), token-based accept/decline, VA-initiated cancel, expiry enforcement, one-pending-global-invite constraint
- `vm-relationships`: VM relationship lifecycle — global VM (one at a time), journey-level VM assignment, removal/withdrawal, global VM migration payload

### Modified Capabilities
- (none — invitation and VM relationship behavior is all new; `has-permission` already has all required permission checks implemented)

## Impact

- **New modules**: `apps/api/src/modules/invitations/`, `apps/api/src/modules/vm-relationships/`
- **New email templates**: `apps/api/src/modules/email/templates/` (4 templates)
- **No schema migration needed**: `Invitation`, `VmRelationship`, `JourneyVmAssignment` models already in `schema.prisma`
- **No permission system changes**: `hasPermission` already handles `vm_invitation.send/accept/cancel/decline` and `vm_relationship.withdraw`
- **JourneysRepository**: `buildJourneySlim` must load `globalVmRelationship` — currently returns `null`, must query `VmRelationship` for active global VM
- **APIs added**: `POST /api/v1/invitations`, `POST /api/v1/invitations/:token/accept`, `POST /api/v1/invitations/:token/decline`, `DELETE /api/v1/invitations/:id`, `GET /api/v1/invitations` (list own), `POST /api/v1/vm-relationships/global` (assign), `DELETE /api/v1/vm-relationships/global` (remove), `POST /api/v1/journeys/:id/vm` (assign journey VM), `DELETE /api/v1/journeys/:id/vm` (remove journey VM)
