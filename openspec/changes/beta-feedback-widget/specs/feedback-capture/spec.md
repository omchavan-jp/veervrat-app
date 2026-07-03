# feedback-capture — delta spec

## ADDED Requirements

### Requirement: Authenticated user can raise a feedback item
The system SHALL allow any authenticated user to create a feedback item via
`POST /api/v1/feedback` with a required `type` (`ISSUE` | `IMPROVEMENT`), a required
`title` (1–120 chars), and an optional `description` (≤2000 chars). The request MAY
include client context fields — `route` (≤300), `locale` (≤10), `viewport` (≤20),
`commitSha` (≤64) — each validated and length-capped. The system SHALL stamp
`reporterId` and a `reporterRole` snapshot from the session (never from the body) and
SHALL record `userAgent` from the request header (truncated to 300 chars). New items
SHALL start in status `NEW`. The response SHALL be `201` with `{ data }` containing the
created item.

#### Scenario: Successful creation with auto-context
- **WHEN** an authenticated vratarthi submits `type=ISSUE`, `title="Toggle broken"`, with `route="/dashboard"`, `locale="mr"`, `commitSha="abc123"`
- **THEN** the system creates the item with status `NEW`, `reporterId` and `reporterRole` from the session, `userAgent` from the request header, and returns it in `{ data }`

#### Scenario: Validation failure
- **WHEN** a request omits `title` or supplies a `type` outside the enum
- **THEN** the system responds `422` (platform validation convention) with the standard error shape and creates nothing

#### Scenario: Unauthenticated request
- **WHEN** a request without a valid session calls `POST /api/v1/feedback`
- **THEN** the system responds `401` and creates nothing

#### Scenario: Reporter identity cannot be spoofed
- **WHEN** the request body includes a `reporterId` or `reporterRole` field
- **THEN** the system rejects the request with `422` (non-whitelisted fields are forbidden platform-wide); identity always comes from the session

### Requirement: Feedback creation is rate-limited
The system SHALL throttle `POST /api/v1/feedback` per user (10 per hour) and
`POST /api/v1/feedback/:id/upvote` (60 per hour), responding `429` beyond the limit.

#### Scenario: Create limit exceeded
- **WHEN** a user submits an 11th feedback item within one hour
- **THEN** the system responds `429` and creates nothing

### Requirement: Authenticated user can list open feedback items
The system SHALL allow any authenticated user to list feedback items via
`GET /api/v1/feedback` with cursor-based pagination. By default the list SHALL contain
only non-terminal items (`NEW`, `TRIAGED`), newest first, and each item SHALL include
its upvote count and whether the requesting user has upvoted it. An
`includeResolved=true` query parameter SHALL additionally return `DONE` and `DECLINED`
items (with `declineReason` when present).

#### Scenario: Default list
- **WHEN** an authenticated user requests `GET /api/v1/feedback`
- **THEN** the response contains only `NEW` and `TRIAGED` items, newest first, each with `upvoteCount` and `hasUpvoted`, using the standard cursor pagination shape

#### Scenario: Unauthenticated list request
- **WHEN** a request without a valid session calls `GET /api/v1/feedback`
- **THEN** the system responds `401`

### Requirement: User can toggle an upvote on a feedback item
The system SHALL allow any authenticated user to toggle their upvote on a feedback item
via `POST /api/v1/feedback/:id/upvote`. A user SHALL have at most one upvote per item
(unique constraint); toggling twice returns the item to its prior count. Upvoting a
non-existent item SHALL respond `404`.

#### Scenario: Upvote then remove
- **WHEN** a user calls upvote on an item they have not upvoted, then calls it again
- **THEN** the first call increments `upvoteCount` and sets `hasUpvoted=true`; the second decrements it and sets `hasUpvoted=false`

#### Scenario: Upvote a missing item
- **WHEN** a user calls upvote with an id that does not exist
- **THEN** the system responds `404` with the standard error shape
