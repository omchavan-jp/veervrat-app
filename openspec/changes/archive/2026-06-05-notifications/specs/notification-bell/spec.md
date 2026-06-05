## ADDED Requirements

### Requirement: App header shows a bell icon with unread notification count badge
The authenticated app header (`components/layout/header.tsx`) SHALL include a bell icon button. When the user has one or more unread notifications (`readAt IS NULL`, `archivedAt IS NULL`), a badge SHALL be displayed on the bell showing the count. The badge SHALL be suppressed (not shown) when the count is zero. The unread count SHALL be refreshed by polling `GET /api/v1/notifications/unread-count` every 30 seconds via TanStack Query `refetchInterval`.

#### Scenario: POSITIVE — bell shows badge when unread notifications exist
- **WHEN** the authenticated user has unread notifications
- **THEN** the bell icon SHALL display a badge with the unread count
- **THEN** the badge SHALL update within 30 seconds of new notifications being created

#### Scenario: POSITIVE — bell shows no badge when all notifications are read
- **WHEN** all notifications have `readAt` set (or there are none)
- **THEN** the bell icon SHALL display no badge

### Requirement: Clicking the bell opens a notification panel dropdown
Clicking the bell icon SHALL open a `Popover` (shadcn/ui) displaying the notification panel. The panel SHALL show the most recent 20 notifications (excluding archived). Each notification item SHALL display: a human-readable description derived from `eventType`, the `actor.displayName` if present, a relative timestamp (e.g. "2 hours ago"), and a visual indicator for unread status (e.g. a filled dot or bold text). The panel SHALL include a "Mark all as read" button at the top. Clicking any notification item SHALL mark it as read (via `PATCH /api/v1/notifications/:id/read`) and navigate to the relevant resource if `resourceId` is set.

#### Scenario: POSITIVE — panel opens with notification list
- **WHEN** the user clicks the bell icon
- **THEN** a dropdown panel SHALL appear showing up to 20 recent notifications
- **THEN** unread notifications SHALL be visually distinguished from read ones

#### Scenario: POSITIVE — clicking a notification marks it read
- **WHEN** the user clicks a notification item in the panel
- **THEN** `PATCH /api/v1/notifications/:id/read` SHALL be called
- **THEN** the notification's unread indicator SHALL be cleared
- **THEN** the unread count badge SHALL decrement accordingly

#### Scenario: POSITIVE — "Mark all as read" clears all unread indicators
- **WHEN** the user clicks "Mark all as read" in the notification panel
- **THEN** `POST /api/v1/notifications/read-all` SHALL be called
- **THEN** all notifications in the panel SHALL lose their unread indicator
- **THEN** the badge on the bell icon SHALL be cleared

#### Scenario: POSITIVE — empty state when no notifications
- **WHEN** the user has no notifications
- **THEN** the panel SHALL show an appropriate empty state message
