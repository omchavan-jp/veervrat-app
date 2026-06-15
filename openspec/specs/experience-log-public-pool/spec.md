# experience-log-public-pool Specification

## Purpose
TBD - created by archiving change experience-logging. Update Purpose after archive.
## Requirements
### Requirement: Public experience pool endpoint

`GET /api/v1/experience-logs/public` SHALL return a paginated (cursor-based) list of experience logs that are Public, non-draft, and not soft-deleted, across all authors. It SHALL be guest-accessible (no authentication required). Each item SHALL include the author (display name, username, avatar), creation/publish date, body, and tags. The filter (`visibility=PUBLIC AND isDraft=false AND deletedAt IS NULL`) SHALL be applied at the repository and never derived from client input.

#### Scenario: guest browses the public pool

- **WHEN** an unauthenticated request calls `GET /api/v1/experience-logs/public`
- **THEN** a paginated list of Public, non-draft entries is returned with author and tags

#### Scenario: non-public and draft entries are excluded

- **WHEN** the pool is fetched and some entries are ONLY_ME, FRIENDS, drafts, or soft-deleted
- **THEN** none of those entries appear in the response

#### Scenario: pagination via cursor

- **WHEN** the pool has more entries than one page and `GET /api/v1/experience-logs/public?cursor=<id>` is called
- **THEN** the next page is returned with a `nextCursor` (null on the last page)

