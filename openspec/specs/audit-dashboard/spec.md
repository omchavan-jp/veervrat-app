# audit-dashboard Specification

## Purpose
TBD - created by archiving change admin-user-management. Update Purpose after archive.
## Requirements
### Requirement: Admin audit-event dashboard
The system SHALL provide an admin-only UI to browse audit events over the existing
`GET /api/v1/admin/audit-events` endpoint, with filtering by action and actor and cursor
pagination.

#### Scenario: Admin views the audit log
- **WHEN** an admin opens the audit dashboard
- **THEN** recent audit events are listed with timestamp, actor, action, resource, and metadata

#### Scenario: Admin filters the audit log
- **WHEN** an admin filters by an action or actor
- **THEN** only matching audit events are shown

#### Scenario: Non-admin cannot access
- **WHEN** a non-admin requests `/api/v1/admin/audit-events`
- **THEN** the system returns 403

