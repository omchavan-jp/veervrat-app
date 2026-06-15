## MODIFIED Requirements

### Requirement: Read own list and single entry with visibility enforcement

`GET /api/v1/experience-logs` SHALL return the caller's own entries (drafts + published, excluding soft-deleted). `GET /api/v1/experience-logs/:id` SHALL return a single entry only if the caller may view it: the author always; a Public non-draft entry to anyone; a journey-tagged entry to the assigned/global VM of that journey; a Friends-tier entry to a viewer who mutually follows the author (both follow each other). Entries the caller may not view SHALL be reported as not found (existence not leaked).

#### Scenario: author reads their own draft

- **WHEN** the author GETs their own draft by id
- **THEN** the entry is returned

#### Scenario: anyone reads a Public entry

- **WHEN** any authenticated user GETs another user's Public, non-draft entry by id
- **THEN** the entry is returned

#### Scenario: assigned VM reads a journey-tagged entry

- **WHEN** the VM assigned to a journey GETs an entry tied to that journey
- **THEN** the entry is returned

#### Scenario: mutual follower reads a Friends entry

- **WHEN** a viewer who mutually follows the author GETs a FRIENDS entry
- **THEN** the entry is returned

#### Scenario: NEGATIVE — non-mutual viewer cannot read a Friends entry

- **WHEN** a viewer who does not mutually follow the author GETs a FRIENDS entry
- **THEN** the entry is not returned

#### Scenario: NEGATIVE — non-author cannot read an Only-me entry

- **WHEN** a user who is not the author GETs an ONLY_ME entry
- **THEN** the response is 403 (or 404 — existence not leaked)
