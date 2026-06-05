## ADDED Requirements

### Requirement: System soft-archives notifications older than 90 days
A background job SHALL run once daily and set `archivedAt = now()` on all notifications where `createdAt < now() - 90 days` AND `archivedAt IS NULL`. This is a soft-archive — rows are retained in the database and not deleted. Archived notifications are excluded from the default list endpoint response.

The job SHALL be implemented using `@nestjs/schedule` (already approved in Platform-Engineering-Standard). It SHALL run at a fixed daily time (03:07 server time — off-peak). The job SHALL be logged on start, success (with row count), and failure at the structured logging level.

#### Scenario: POSITIVE — old notifications are archived
- **WHEN** the daily archive job runs
- **AND** there exist notifications with `createdAt` older than 90 days and `archivedAt IS NULL`
- **THEN** those notifications SHALL have `archivedAt` set to the current timestamp
- **THEN** the job SHALL log the number of rows archived

#### Scenario: POSITIVE — recently created notifications are not archived
- **WHEN** the daily archive job runs
- **AND** a notification has `createdAt` within the last 90 days
- **THEN** that notification's `archivedAt` SHALL remain null

#### Scenario: POSITIVE — already-archived notifications are not re-processed
- **WHEN** the daily archive job runs
- **AND** a notification already has `archivedAt` set
- **THEN** that notification SHALL NOT be updated again (idempotent)

#### Scenario: POSITIVE — archived notifications are excluded from the list endpoint by default
- **WHEN** `GET /api/v1/notifications` is called after notifications have been archived
- **THEN** notifications with `archivedAt IS NOT NULL` SHALL NOT appear in the response
