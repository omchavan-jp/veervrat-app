## ADDED Requirements

### Requirement: Pothi sections

`GET /api/v1/pothi/sections` SHALL return the Pothi sections in order, each with its intro/commentary, ordered shlokas (Devanagari + transliteration + meaning + source), congregation response, post-shloka commentary, and any linked resources. Guest-accessible.

#### Scenario: guest reads the Pothi

- **WHEN** a guest calls `GET /api/v1/pothi/sections`
- **THEN** the sections are returned in order with their shlokas and commentary

### Requirement: Shlokas list, search, and detail

`GET /api/v1/shlokas` SHALL return shlokas paginated, optionally filtered by source, guest-accessible. `GET /api/v1/shlokas/search?q=` SHALL return shlokas matching the query via the search index (queries under 2 chars empty; backend-unavailable degrades to empty). `GET /api/v1/shlokas/:id` SHALL return a shloka with its formal tags resolved to entity names, its loose tags, and any linked resources.

#### Scenario: guest lists and filters shlokas

- **WHEN** a guest calls `GET /api/v1/shlokas` (optionally with a source filter)
- **THEN** matching shlokas are returned, paginated

#### Scenario: guest searches shlokas

- **WHEN** a guest searches for a word appearing in a shloka's text or meaning
- **THEN** that shloka is returned

#### Scenario: shloka detail resolves formal tags

- **WHEN** a guest opens a shloka detail
- **THEN** formal tags are returned with their entity names and loose tags are included

#### Scenario: NEGATIVE — unknown shloka id

- **WHEN** `GET /api/v1/shlokas/:id` is called with a non-existent id
- **THEN** the response is 404

### Requirement: Shloka of the day

`GET /api/v1/shlokas/today` SHALL return the shloka scheduled for today if one exists; otherwise the next from the rotating queue; otherwise null. Guest-accessible.

#### Scenario: scheduled shloka takes priority

- **WHEN** a shloka is scheduled for today's date
- **THEN** `GET /api/v1/shlokas/today` returns that shloka

#### Scenario: falls back to the queue

- **WHEN** no shloka is scheduled for today but the queue is non-empty
- **THEN** a shloka from the queue is returned

#### Scenario: empty when nothing scheduled or queued

- **WHEN** there is no schedule and no queue
- **THEN** the response data is null (not an error)

### Requirement: Resources list and detail

`GET /api/v1/resources` SHALL return resources paginated, optionally filtered by type (file/link), guest-accessible. `GET /api/v1/resources/:id` SHALL return a resource with its rich-text description, formal tags resolved to entity names, and loose tags.

#### Scenario: guest lists resources

- **WHEN** a guest calls `GET /api/v1/resources` (optionally filtered by type)
- **THEN** matching resources are returned, paginated

#### Scenario: NEGATIVE — unknown resource id

- **WHEN** `GET /api/v1/resources/:id` is called with a non-existent id
- **THEN** the response is 404
