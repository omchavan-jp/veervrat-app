# admin-user-management Specification

## Purpose
TBD - created by archiving change admin-user-management. Update Purpose after archive.
## Requirements
### Requirement: Admin user listing and detail
The system SHALL allow admins to list all users (paginated, with roles and account-status
flags) and to view any single user's full read-only profile including their journeys, test
attempts, and experience logs. These reads SHALL be admin-only.

#### Scenario: Admin lists users
- **WHEN** an admin GETs `/api/v1/admin/users`
- **THEN** a paginated list of users with roles and status flags is returned

#### Scenario: Admin views a user's full profile
- **WHEN** an admin GETs `/api/v1/admin/users/:id`
- **THEN** the user's account fields, roles, journeys, test attempts, and experience logs are returned read-only

#### Scenario: Non-admin denied
- **WHEN** a non-admin calls any `/api/v1/admin/users` read or write
- **THEN** the system returns 403

### Requirement: Role management
The system SHALL allow admins to add and remove roles on a user, audit-logged. An admin
SHALL NOT be able to remove their own ADMIN role.

#### Scenario: Admin assigns a role
- **WHEN** an admin PATCHes `/api/v1/admin/users/:id/roles` with `{ add: ["MODERATOR"] }`
- **THEN** the role is added and `admin.manage_user_role` is audited

#### Scenario: Admin cannot self-demote
- **WHEN** an admin attempts to remove ADMIN from their own account
- **THEN** the system rejects the change (409) and the role is retained

### Requirement: Suspend and force-logout
The system SHALL allow admins to suspend/unsuspend a user and to force-logout a user. A
suspended user's sessions SHALL be invalidated and they SHALL NOT be able to authenticate
until unsuspended. These actions SHALL be audit-logged.

#### Scenario: Admin suspends a user
- **WHEN** an admin POSTs `/api/v1/admin/users/:id/suspend` with `{ suspended: true }`
- **THEN** the user's `suspendedAt` is set, all their sessions are deleted, and `admin.suspend_user` is audited

#### Scenario: Suspended user is denied
- **WHEN** a suspended user makes an authenticated request or attempts to log in
- **THEN** the request/login is rejected

#### Scenario: Force-logout
- **WHEN** an admin POSTs `/api/v1/admin/users/:id/force-logout`
- **THEN** all the user's sessions are deleted and `admin.force_logout` is audited

### Requirement: Account anonymisation
The system SHALL allow admins to anonymise a user account: replace personal identifiers with
a pseudonymous token, soft-delete the account, invalidate sessions, and cancel the user's
pending invitations, while retaining their journey/ERC/test/log content. This SHALL be
audit-logged and SHALL NOT be performable on one's own account.

#### Scenario: Admin anonymises a user
- **WHEN** an admin POSTs `/api/v1/admin/users/:id/anonymise` with a reason
- **THEN** displayName/email/username/avatar are replaced with a pseudonym, `anonymisedAt` and `deletedAt` are set, sessions are deleted, pending invitations are cancelled, and `admin.anonymise_user` is audited

#### Scenario: Content retained after anonymisation
- **WHEN** a user has been anonymised
- **THEN** their journeys, test results, and experience logs still exist (attributed to the pseudonym)

#### Scenario: Admin cannot anonymise self
- **WHEN** an admin attempts to anonymise their own account via this surface
- **THEN** the system returns 409

### Requirement: Emergency journey state override
The system SHALL allow admins to override a journey's state with a required reason, for
emergency use, audit-logged.

#### Scenario: Admin overrides journey state
- **WHEN** an admin PATCHes `/api/v1/admin/journeys/:id/state` with `{ state, reason }`
- **THEN** the journey's state is set and `admin.override_journey_state` is audited with from/to state and reason

#### Scenario: Reason required
- **WHEN** an admin omits the reason
- **THEN** the system returns a validation error and the state is unchanged

