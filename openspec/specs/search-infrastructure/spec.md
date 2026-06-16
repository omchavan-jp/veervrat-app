# search-infrastructure Specification

## Purpose
TBD - created by archiving change user-search. Update Purpose after archive.
## Requirements
### Requirement: Meilisearch client and index sync

The system SHALL provide a Meilisearch integration: a configured client (host + master key from environment), a health check, and an index-sync primitive other modules use to keep their indices current. Index synchronization SHALL run after the database write (eventually consistent) and SHALL NOT cause the originating write to fail if the search backend is unavailable — sync failures are logged, not propagated. On startup the system SHALL ensure required indices exist with their configured searchable/filterable attributes.

#### Scenario: index ensured at startup

- **WHEN** the application boots with Meilisearch reachable
- **THEN** the `users` index exists with `username` and `displayName` searchable and `isPublic` filterable

#### Scenario: write succeeds even if sync fails

- **WHEN** a user is created or updated and the search backend is unreachable
- **THEN** the database write succeeds and the sync failure is logged, not thrown

#### Scenario: user changes propagate to the index

- **WHEN** a user updates their profile (display name / username / privacy)
- **THEN** the corresponding index document is updated so subsequent searches reflect the change

### Requirement: Sensitive fields excluded from the index

The search index SHALL NOT store sensitive fields. The `users` index SHALL contain only non-sensitive, searchable/displayable fields (id, username, display name, public flag, presence) and SHALL NOT contain email addresses.

#### Scenario: email is not indexed

- **WHEN** a user is indexed
- **THEN** their email address is not present in the index document

### Requirement: Multiple indices on the shared search stack

The search stack SHALL support multiple independent indices, each owned by its own `<Entity>IndexService` using the shared client. Adding an index SHALL NOT affect existing indices. A `blogs` index SHALL exist alongside the `users` index, holding only published, non-deleted blogs with title + plain-text body searchable.

#### Scenario: blogs index coexists with users index

- **WHEN** the application boots
- **THEN** both the `users` and `blogs` indices are ensured, each with their own searchable/filterable settings

#### Scenario: indices are independent

- **WHEN** the blogs index is updated or unavailable
- **THEN** user search continues to function unaffected

