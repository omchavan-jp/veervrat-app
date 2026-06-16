# invitation-ui Specification

## Purpose
TBD - created by archiving change user-search. Update Purpose after archive.
## Requirements
### Requirement: Invitation flow UI

The frontend SHALL provide an invitation flow reachable from My Vratmitras (and journey settings): a debounced user search box, result rows showing display name, username, presence, and follow status, selection of a user, a scope choice (Global VM / this journey / platform invite), and a send action. The flow SHALL handle loading, empty (no results), error, and success states; be localized; and be responsive.

#### Scenario: search and select a user to invite as VM

- **WHEN** a VA searches, picks a user, chooses a scope, and sends
- **THEN** the invitation is created and the VA sees confirmation

#### Scenario: empty search state

- **WHEN** a search returns no users
- **THEN** a localized "no results" state is shown (not a blank box)

#### Scenario: invite a non-platform user by email

- **WHEN** the VA enters an email with no matching user
- **THEN** the VA can send a platform/VM invite to that email

### Requirement: Pending invitations management UI

The frontend SHALL show the VA's invitations with status badges (pending / accepted / declined / expired), a "Send reminder" action (enabled only once per invitation), a "Cancel" action for pending invites, and a copyable, editable shareable message.

#### Scenario: resend a reminder once

- **WHEN** the VA clicks "Send reminder" on a pending invitation
- **THEN** the reminder is sent and the action becomes disabled for that invitation

#### Scenario: cancel a pending invitation

- **WHEN** the VA cancels a pending invitation
- **THEN** the invitation is cancelled and reflects that status

#### Scenario: copy the shareable message

- **WHEN** the VA opens the shareable message
- **THEN** an auto-generated message with the invite link is shown and can be copied/edited

