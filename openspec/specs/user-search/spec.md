# user-search Specification

## Purpose
TBD - created by archiving change user-search. Update Purpose after archive.
## Requirements
### Requirement: User search endpoint

`GET /api/v1/users/search?q=` SHALL be authenticated and return users matching the query: typo-tolerant match on username and display name (via the Meilisearch `users` index), and exact match on a full email address (no partial email match; email is resolved by a strongly-consistent DB lookup and is never stored in the search index). It SHALL exclude private profiles and the requesting user. Results SHALL be relevance-ranked with any exact email/username hit first, capped to a small limit, and SHALL include presence (last active / online, honoring the user's privacy settings) and the requester's follow status. Queries shorter than 2 characters SHALL return an empty result. If the search backend is unavailable, the endpoint SHALL return an empty result rather than erroring.

#### Scenario: fuzzy match on username/display name

- **WHEN** an authenticated user searches `?q=` with a partial name or username
- **THEN** matching users are returned, typo-tolerant, ranked exact-first

#### Scenario: exact email match

- **WHEN** the query is a full email address belonging to a user
- **THEN** that user is returned

#### Scenario: partial email does not match

- **WHEN** the query is a fragment of an email (not the full address)
- **THEN** no user is matched on email by that fragment

#### Scenario: private profiles and self excluded

- **WHEN** a search would match a private profile or the requester themselves
- **THEN** those users are absent from the results

#### Scenario: NEGATIVE — too-short query

- **WHEN** the query is shorter than 2 characters
- **THEN** the result is empty

#### Scenario: NEGATIVE — unauthenticated

- **WHEN** the search is called without a valid session
- **THEN** the response is 401

#### Scenario: search backend unavailable degrades gracefully

- **WHEN** the Meilisearch backend is unreachable and an authenticated user searches
- **THEN** the endpoint returns an empty result (not a 5xx)

