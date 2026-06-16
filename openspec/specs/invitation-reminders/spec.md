# invitation-reminders Specification

## Purpose
TBD - created by archiving change user-search. Update Purpose after archive.
## Requirements
### Requirement: Send invitation reminder (one allowed)

`POST /api/v1/invitations/:id/reminder` SHALL allow the inviter to re-send a pending invitation's email exactly once. It SHALL be rejected if the caller is not the inviter, if the invitation is not pending, or if a reminder has already been sent (tracked via `reminderSentAt`). On success it re-sends the invitation email and stamps `reminderSentAt`.

#### Scenario: inviter sends the one allowed reminder

- **WHEN** the inviter sends a reminder for a pending invitation that has no prior reminder
- **THEN** the invitation email is re-sent and `reminderSentAt` is set

#### Scenario: NEGATIVE — second reminder rejected

- **WHEN** the inviter sends a reminder for an invitation that already has `reminderSentAt`
- **THEN** the request is rejected (no second email)

#### Scenario: NEGATIVE — non-inviter cannot remind

- **WHEN** a user who is not the inviter calls the reminder endpoint
- **THEN** the response is 403

#### Scenario: NEGATIVE — reminder on a non-pending invitation

- **WHEN** a reminder is sent for an accepted/declined/expired invitation
- **THEN** the request is rejected

