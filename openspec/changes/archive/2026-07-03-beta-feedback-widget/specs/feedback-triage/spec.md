# feedback-triage — delta spec

## ADDED Requirements

### Requirement: Admin can update feedback status
The system SHALL allow admins to update a feedback item via `PATCH /api/v1/feedback/:id`
with `status` (`TRIAGED` | `DONE` | `DECLINED`) and, when declining, a required
`declineReason` (1–500 chars). Authorization SHALL be enforced in two layers: the auth
guard (identity) and `hasPermission(user, resource, action)` for the `feedback` resource
`manage` action (admin-only per the permission matrix). Non-admin callers SHALL receive
`403`. Declining without a `declineReason` SHALL be rejected (`422`, platform validation convention).

#### Scenario: Admin triages an item
- **WHEN** an admin PATCHes an item in status `NEW` with `status=TRIAGED`
- **THEN** the item's status becomes `TRIAGED` and the updated item is returned in `{ data }`

#### Scenario: Admin declines with a reason
- **WHEN** an admin PATCHes an item with `status=DECLINED` and `declineReason="Duplicate of #12"`
- **THEN** the item stores the reason and is excluded from the default tester list

#### Scenario: Decline without reason rejected
- **WHEN** an admin PATCHes an item with `status=DECLINED` and no `declineReason`
- **THEN** the system responds `422` and the item is unchanged

#### Scenario: Non-admin denied
- **WHEN** a vratarthi, vratmitra, or moderator PATCHes any feedback item
- **THEN** the system responds `403` and the item is unchanged

### Requirement: Admin status changes are audit-logged
The system SHALL record an audit event (via the `@Audited()` pattern per the audit
schema) for every feedback status change, capturing the actor, the item id, and the
old and new status.

#### Scenario: Audit event on status change
- **WHEN** an admin changes an item from `NEW` to `DONE`
- **THEN** an audit event is recorded with the actor id, feedback item id, and the `NEW → DONE` transition
