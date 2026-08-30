## ADDED Requirements

### Requirement: One live journey per sentence per vratarthi

A vratarthi MUST NOT have more than one live (non-deleted, non-completed) journey for
the same sentence. This invariant MUST be enforced at the database level, not only by an
application-level check, so that concurrent create requests cannot both succeed.

A "live" journey is one whose `deleted_at IS NULL` and whose `state` is not `completed`
(i.e. `not_started`, `active`, `paused`, or `dormant`). Completed and soft-deleted
journeys for the same sentence are permitted (a vratarthi may re-journey a sentence after
completing it).

#### Scenario: Second concurrent create for the same sentence is rejected

- **WHEN** two create-journey requests for the same `(vratarthi, sentence)` are processed
  concurrently and both pass the application-level existence check
- **THEN** exactly one journey row is created
- **AND** the other request fails with a journey-conflict error (not a 500), carrying the
  id and state of the winning journey

#### Scenario: Re-journeying a completed sentence is allowed

- **WHEN** a vratarthi creates a journey for a sentence whose only prior journey is
  `completed` (or soft-deleted)
- **THEN** the new journey is created successfully

#### Scenario: Sequential duplicate attempt returns a conflict

- **WHEN** a vratarthi requests a new journey for a sentence they already have a live
  journey for
- **THEN** the request fails with a journey-conflict error referencing the existing
  journey's id and state
