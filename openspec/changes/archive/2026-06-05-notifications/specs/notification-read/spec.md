## ADDED Requirements

### Requirement: Authenticated user can mark a single notification as read
`PATCH /api/v1/notifications/:id/read` SHALL set `readAt = now()` on the notification if `readAt` is currently null. If the notification is already read, the operation SHALL be idempotent (return 200 with no change). If the notification does not belong to the calling user, the response SHALL return 403.

#### Scenario: POSITIVE — mark unread notification as read
- **WHEN** `PATCH /api/v1/notifications/:id/read` is called by the notification's recipient
- **AND** the notification has `readAt = null`
- **THEN** `readAt` SHALL be set to the current timestamp
- **THEN** the response SHALL return 200 with the updated notification object

#### Scenario: POSITIVE — marking already-read notification is idempotent
- **WHEN** `PATCH /api/v1/notifications/:id/read` is called on a notification that already has `readAt` set
- **THEN** `readAt` SHALL remain unchanged
- **THEN** the response SHALL return 200

#### Scenario: AUTH MATRIX NEGATIVE — user cannot mark another user's notification as read
- **WHEN** `PATCH /api/v1/notifications/:id/read` is called by a user who is NOT the notification recipient
- **THEN** the response SHALL return 403

#### Scenario: AUTH MATRIX NEGATIVE — unauthenticated request is rejected
- **WHEN** `PATCH /api/v1/notifications/:id/read` is called without a valid session
- **THEN** the response SHALL return 401

#### Scenario: NEGATIVE — notification not found
- **WHEN** `PATCH /api/v1/notifications/:id/read` is called with a non-existent notification ID
- **THEN** the response SHALL return 404

### Requirement: Authenticated user can mark all their notifications as read
`POST /api/v1/notifications/read-all` SHALL set `readAt = now()` on all notifications for the calling user where `readAt IS NULL`. If there are no unread notifications, the operation SHALL succeed with no rows updated (idempotent). The response SHALL include the count of notifications updated.

#### Scenario: POSITIVE — mark all unread as read
- **WHEN** `POST /api/v1/notifications/read-all` is called by an authenticated user who has unread notifications
- **THEN** all notifications for that user with `readAt = null` SHALL have `readAt` set to now
- **THEN** the response SHALL return 200 with `{ data: { updated: <count> } }`

#### Scenario: POSITIVE — no unread notifications is idempotent
- **WHEN** `POST /api/v1/notifications/read-all` is called when all notifications are already read
- **THEN** the response SHALL return 200 with `{ data: { updated: 0 } }`

#### Scenario: AUTH MATRIX NEGATIVE — unauthenticated request is rejected
- **WHEN** `POST /api/v1/notifications/read-all` is called without a valid session
- **THEN** the response SHALL return 401
