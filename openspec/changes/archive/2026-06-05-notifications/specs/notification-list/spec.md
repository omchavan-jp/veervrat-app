## ADDED Requirements

### Requirement: Authenticated user can list their own notifications
`GET /api/v1/notifications` SHALL return a cursor-paginated list of notifications for the authenticated user, ordered by `createdAt DESC`. Archived notifications (where `archivedAt IS NOT NULL`) SHALL be excluded by default. The response SHALL include `items` (array of notification objects) and `meta.nextCursor` (null when no more pages exist). Default page size is 20, maximum is 100.

Each notification object SHALL include: `id`, `eventType`, `resourceType`, `resourceId`, `readAt`, `dismissedAt`, `archivedAt`, `createdAt`, and an `actor` field containing `{ id, displayName, avatarUrl }` when `actorId` is set, or `null` for system events.

#### Scenario: POSITIVE — VA lists their notifications
- **WHEN** `GET /api/v1/notifications` is called by an authenticated user
- **THEN** the response SHALL return 200 with `{ data: { items: [...], meta: { nextCursor } } }`
- **THEN** each item SHALL include `id`, `eventType`, `resourceType`, `resourceId`, `readAt`, `createdAt`
- **THEN** items SHALL be ordered most recent first
- **THEN** archived notifications SHALL NOT appear in the list

#### Scenario: POSITIVE — cursor pagination
- **WHEN** `GET /api/v1/notifications?cursor=<token>&pageSize=10` is called
- **THEN** the response SHALL return the next page starting after the cursor position
- **THEN** `meta.nextCursor` SHALL be `null` when there are no more items

#### Scenario: POSITIVE — notification with actor includes actor info
- **WHEN** `GET /api/v1/notifications` returns a notification that has a non-null `actorId`
- **THEN** the notification object SHALL include an `actor` field with `{ id, displayName, avatarUrl }`

#### Scenario: POSITIVE — system notification has null actor
- **WHEN** `GET /api/v1/notifications` returns a notification with `actorId = null`
- **THEN** the notification object SHALL have `actor: null`

#### Scenario: AUTH MATRIX NEGATIVE — unauthenticated request is rejected
- **WHEN** `GET /api/v1/notifications` is called without a valid session
- **THEN** the response SHALL return 401

### Requirement: Authenticated user can get their unread notification count
`GET /api/v1/notifications/unread-count` SHALL return the count of notifications for the authenticated user where `readAt IS NULL` and `archivedAt IS NULL`.

#### Scenario: POSITIVE — returns unread count
- **WHEN** `GET /api/v1/notifications/unread-count` is called by an authenticated user
- **THEN** the response SHALL return 200 with `{ data: { count: <number> } }`

#### Scenario: AUTH MATRIX NEGATIVE — unauthenticated request is rejected
- **WHEN** `GET /api/v1/notifications/unread-count` is called without a valid session
- **THEN** the response SHALL return 401
