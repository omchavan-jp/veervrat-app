## ADDED Requirements

### Requirement: List VA's assigned Vratmitras with scope and journey assignments
The system SHALL provide an endpoint `GET /api/v1/vm-relationships/my-vms` that returns the current user's (VA's) list of assigned Vratmitras (VMs) with scope (global or journey-specific) and which journeys each VM is assigned to. Response wrapped in `{ data }` per API conventions.

#### Scenario: VA retrieves list of assigned VMs
- **WHEN** VA calls `GET /api/v1/vm-relationships/my-vms`
- **THEN** system returns array of VM objects with id, name, displayName, avatar, scope (GLOBAL or JOURNEY), assigned journey IDs

#### Scenario: VA with no assigned VMs
- **WHEN** VA with no VMs calls the endpoint
- **THEN** system returns empty array

#### Scenario: Unauthenticated user cannot access
- **WHEN** unauthenticated user calls the endpoint
- **THEN** system returns 401 Unauthorized

#### Scenario: VM or other role cannot call endpoint (only VA)
- **WHEN** non-VA user calls the endpoint (e.g., VM, admin, moderator)
- **THEN** system returns 403 Forbidden

### Requirement: Filter by scope type
The endpoint SHALL support optional `scope` query parameter to filter by GLOBAL or JOURNEY scope.

#### Scenario: Filter by global scope
- **WHEN** VA calls `GET /api/v1/vm-relationships/my-vms?scope=GLOBAL`
- **THEN** system returns only VMs with global assignment

#### Scenario: Filter by journey scope
- **WHEN** VA calls `GET /api/v1/vm-relationships/my-vms?scope=JOURNEY`
- **THEN** system returns only VMs assigned to specific journeys
