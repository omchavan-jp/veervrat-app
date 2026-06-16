# blog-search Specification

## Purpose
TBD - created by archiving change blogs. Update Purpose after archive.
## Requirements
### Requirement: Blog search index

The system SHALL maintain a Meilisearch `blogs` index (searchable: title + plain-text body) containing only published, non-deleted blogs. The index SHALL be synced on publish (upsert), edit-while-published (upsert), and unpublish/delete (remove). Sync SHALL be best-effort — failures are logged, never propagated into the write path. `GET /api/v1/blogs/search?q=` SHALL return matching published blogs by relevance, accessible to guests; queries under 2 characters SHALL return empty; if the backend is unavailable it SHALL return empty rather than erroring.

#### Scenario: published blog is searchable

- **WHEN** a blog is published and a guest searches for a word in its title or body
- **THEN** the blog appears in the search results

#### Scenario: drafts and deleted blogs are not searchable

- **WHEN** a blog is a draft or has been deleted
- **THEN** it does not appear in search results

#### Scenario: too-short query

- **WHEN** the search query is shorter than 2 characters
- **THEN** the result is empty

#### Scenario: backend unavailable degrades

- **WHEN** the search backend is unreachable
- **THEN** the search endpoint returns an empty result (not a 5xx)

