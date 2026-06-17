## ADDED Requirements

### Requirement: Shlokas search index

The system SHALL maintain a Meilisearch `shlokas` index (searchable: Devanagari text, transliteration, meanings, loose tags) on the shared search stack. It SHALL expose `upsert`/`remove` sync operations (called by admin shloka CRUD) and ensure the index + seed existing shlokas at startup. Sync SHALL be best-effort (failures logged, never thrown). Search SHALL return empty when the backend is unavailable.

#### Scenario: shloka index ensured + seeded at startup

- **WHEN** the application boots with Meilisearch reachable
- **THEN** the `shlokas` index exists and existing shlokas are indexed

#### Scenario: a shloka is searchable

- **WHEN** a shloka is indexed and a guest searches a word from its meaning or text
- **THEN** the shloka appears in search results

#### Scenario: sync failure does not break writes

- **WHEN** the search backend is unreachable during a shloka upsert
- **THEN** the failure is logged and not propagated
