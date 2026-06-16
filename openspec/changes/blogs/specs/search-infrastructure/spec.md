## ADDED Requirements

### Requirement: Multiple indices on the shared search stack

The search stack SHALL support multiple independent indices, each owned by its own `<Entity>IndexService` using the shared client. Adding an index SHALL NOT affect existing indices. A `blogs` index SHALL exist alongside the `users` index, holding only published, non-deleted blogs with title + plain-text body searchable.

#### Scenario: blogs index coexists with users index

- **WHEN** the application boots
- **THEN** both the `users` and `blogs` indices are ensured, each with their own searchable/filterable settings

#### Scenario: indices are independent

- **WHEN** the blogs index is updated or unavailable
- **THEN** user search continues to function unaffected
