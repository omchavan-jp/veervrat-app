# content-overrides-api Specification

## Purpose
TBD - created by archiving change in-context-content-editor. Update Purpose after archive.
## Requirements
### Requirement: Staged overrides are stored in R2 and readable per locale
The API SHALL persist staged content overrides as per-locale JSON in the R2 bucket (keys
`content-overrides/en.json`, `content-overrides/mr.json`) using the existing S3 client — no
Prisma model. It SHALL expose `GET /api/v1/content-overrides` returning the current staged
overrides for both locales (a map of dotted message key → value per locale) so the web app
can merge them, and an upsert route that sets a single key's value for a locale.

#### Scenario: Reading staged overrides
- **WHEN** the web app requests `GET /api/v1/content-overrides` in content-edit mode
- **THEN** it receives the current `{ en: {...}, mr: {...} }` staged override maps

#### Scenario: Upserting a single key
- **WHEN** an authorized editor upserts `feedback.buttonLabel` = `"Nvi feedback"` for `mr`
- **THEN** the `mr` override blob is updated with that key and subsequent reads reflect it

### Requirement: Writes require the `content.edit` permission
Every content-overrides write (upsert, publish) SHALL be authorized via
`hasPermission(user, { type: 'platform' }, 'content.edit')`, backed by the configured
editor allowlist. A request from an authenticated user not on the allowlist SHALL be
rejected with 403; an unauthenticated request SHALL be rejected with 401. When the content
edit feature is disabled (the production default), the content-overrides routes SHALL NOT
process writes.

#### Scenario: Allowlisted editor may write
- **WHEN** a user whose ID is in `CONTENT_EDITOR_USER_IDS` upserts an override
- **THEN** the write succeeds

#### Scenario: Authenticated non-editor is forbidden
- **WHEN** an authenticated user not on the allowlist attempts an upsert
- **THEN** the API responds 403 and nothing is written

#### Scenario: Unauthenticated is rejected
- **WHEN** an unauthenticated request hits an upsert route
- **THEN** the API responds 401

#### Scenario: Disabled in production
- **WHEN** the content-edit feature is disabled and a write is attempted
- **THEN** the route does not process the write

### Requirement: Server-side ICU placeholder validation is authoritative
On upsert the service SHALL compare the ICU placeholder / plural-`select` token set of the
submitted value against the current (baked or previously-staged) value for that key, and
SHALL reject the write (422) when the token sets differ. This check is the authority even
though the client performs the same guard.

#### Scenario: Server rejects placeholder mismatch
- **WHEN** an editor submits `"Hello there"` for a key whose current value is `"Hello {name}"`
- **THEN** the API responds 422 and the override is not stored

### Requirement: Publish opens a reviewed GitHub pull request
`POST /api/v1/content-overrides/publish` SHALL deep-merge the staged overrides over the
baked message files and open a GitHub pull request — via the GitHub REST API — that updates
`apps/web/messages/en.json` and `messages/mr.json` on a new branch. It SHALL NOT push
directly to `dev` or `main`. It SHALL be audit-logged via `@Audited()`, rate-limited, and
return the created pull-request URL. JSON SHALL be written sorted and formatted so the diff
is minimal.

#### Scenario: Publish returns a PR URL
- **WHEN** an allowlisted editor triggers publish with staged edits
- **THEN** a pull request updating both message files on a new branch is opened and its URL is returned

#### Scenario: Publish never writes to the deploy branch directly
- **WHEN** publish runs
- **THEN** no commit is made directly to `dev` or `main`; changes exist only on the PR branch

#### Scenario: Publish is audited
- **WHEN** an allowlisted editor publishes
- **THEN** an audit event records the actor and the resulting PR reference

