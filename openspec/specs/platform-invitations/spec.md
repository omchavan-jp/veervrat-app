# platform-invitations Specification

## Purpose
TBD - created by archiving change user-search. Update Purpose after archive.
## Requirements
### Requirement: Platform invitations

The invitations system SHALL support platform invitations (`InvitationType.PLATFORM`): any authenticated user can invite an email address to join the platform. A platform invitation SHALL have a 30-day expiry (distinct from the 7-day VM invitation expiry), send a signup-link email, carry no scope, and be tracked like other invitations (inviter, invitee email, status, channel). The send response SHALL include an auto-generated, editable shareable message containing the inviter's name, the app name, and the invite link.

#### Scenario: user sends a platform invitation

- **WHEN** an authenticated user sends a `PLATFORM` invitation to an email
- **THEN** an invitation is created with a 30-day expiry, a signup-link email is sent, and a shareable message is returned

#### Scenario: per-type expiry is correct

- **WHEN** a platform invitation and a VM invitation are created
- **THEN** the platform invite expires in 30 days and the VM invite in 7 days

#### Scenario: platform invite appears in the inviter's list

- **WHEN** the inviter lists their invitations
- **THEN** the platform invitation appears with its status

