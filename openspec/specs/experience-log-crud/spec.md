# experience-log-crud Specification

## Purpose
TBD - created by archiving change experience-logging. Update Purpose after archive.
## Requirements
### Requirement: Create experience log

`POST /api/v1/experience-logs` SHALL create an experience log for the authenticated Vratarthi. The body SHALL be a Tiptap JSON document, structurally sanitized server-side before write. An optional `journeyId` ties the entry to a journey (requiring journey ownership). Optional `tags` (entityType + entityId) are written with the entry. New entries SHALL be created as drafts (`isDraft=true`, `visibility=ONLY_ME`, `publishedAt=null`) regardless of any visibility supplied.

#### Scenario: VA creates a global draft

- **WHEN** a VA calls `POST /api/v1/experience-logs` with a valid Tiptap body and no journeyId
- **THEN** an experience log is created with the sanitized body, `isDraft=true`, `visibility=ONLY_ME`, and returned (201)

#### Scenario: VA creates a journey-scoped entry they own

- **WHEN** a VA calls `POST /api/v1/experience-logs` with a `journeyId` for a journey they own
- **THEN** the entry is created with that `journeyId` set

#### Scenario: NEGATIVE — VA cannot create a journey-scoped entry on a journey they do not own

- **WHEN** a VA calls `POST /api/v1/experience-logs` with a `journeyId` for another VA's journey
- **THEN** the response is 403 and no entry is created

#### Scenario: NEGATIVE — invalid/empty body rejected

- **WHEN** `POST /api/v1/experience-logs` is called with a body that is not a Tiptap doc or is empty after sanitization
- **THEN** the response is 400

#### Scenario: NEGATIVE — unauthenticated

- **WHEN** `POST /api/v1/experience-logs` is called without a valid session
- **THEN** the response is 401

### Requirement: Edit and publish experience log

`PATCH /api/v1/experience-logs/:id` SHALL allow the author to update the body, replace the tag set, and change visibility. Publishing a draft (setting `isDraft=false`) SHALL set `publishedAt` and apply the chosen visibility tier. Body updates SHALL be re-sanitized. Visibility changes on a published entry take effect immediately.

#### Scenario: author publishes a draft as Public

- **WHEN** the author PATCHes a draft with `{ isDraft: false, visibility: "PUBLIC" }`
- **THEN** the entry becomes non-draft, `publishedAt` is set, and visibility is PUBLIC

#### Scenario: author downgrades visibility

- **WHEN** the author PATCHes a published Public entry with `{ visibility: "ONLY_ME" }`
- **THEN** the entry is immediately ONLY_ME and no notification is sent

#### Scenario: NEGATIVE — non-author cannot edit

- **WHEN** a user who is not the author PATCHes the entry
- **THEN** the response is 403

### Requirement: Soft-delete experience log

`DELETE /api/v1/experience-logs/:id` SHALL soft-delete the entry (set `deletedAt`), author-only. Soft-deleted entries SHALL NOT appear in any list or detail read.

#### Scenario: author deletes own entry

- **WHEN** the author calls `DELETE /api/v1/experience-logs/:id`
- **THEN** `deletedAt` is set and the entry no longer appears in reads

#### Scenario: NEGATIVE — non-author cannot delete

- **WHEN** a non-author calls `DELETE /api/v1/experience-logs/:id`
- **THEN** the response is 403

### Requirement: Read own list and single entry with visibility enforcement

`GET /api/v1/experience-logs` SHALL return the caller's own entries (drafts + published, excluding soft-deleted). `GET /api/v1/experience-logs/:id` SHALL return a single entry only if the caller may view it: the author always; a Public non-draft entry to anyone; a journey-tagged entry to the assigned/global VM of that journey. Friends-tier entries SHALL be treated as private to non-author/non-VM viewers until the follow system exists (fail-closed).

#### Scenario: author reads their own draft

- **WHEN** the author GETs their own draft by id
- **THEN** the entry is returned

#### Scenario: anyone reads a Public entry

- **WHEN** any authenticated user GETs another user's Public, non-draft entry by id
- **THEN** the entry is returned

#### Scenario: assigned VM reads a journey-tagged entry

- **WHEN** the VM assigned to a journey GETs an entry tied to that journey
- **THEN** the entry is returned

#### Scenario: NEGATIVE — non-author cannot read an Only-me entry

- **WHEN** a user who is not the author GETs an ONLY_ME entry
- **THEN** the response is 403 (or 404 — existence not leaked)

#### Scenario: NEGATIVE — Friends entry hidden from third party (pre-follow-system)

- **WHEN** a non-author, non-VM user GETs a FRIENDS entry
- **THEN** the entry is not returned (fail-closed)

