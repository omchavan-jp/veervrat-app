## Why

The platform already creates `Notification` records (via `NotificationsRepository.create`) from ERC approval, VM suggestions, and custom ERC flows, but there is no way for users to see or interact with those notifications — no list endpoint, no read-marking, no frontend bell icon. This wires the full loop: backend list/read API + 90-day archive cron + frontend bell with unread count and notification panel.

## What Changes

- `NotificationsModule` gains a `NotificationsService` and `NotificationsController` (controller and service were previously absent — only the repository existed and was exported for other modules to call directly)
- New endpoints: `GET /api/v1/notifications` (cursor-paginated), `PATCH /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all`
- 90-day soft-archive background job via `@nestjs/schedule` — sets `archivedAt` on notifications older than 90 days (field already in schema)
- Frontend bell icon in the app header with unread count badge, dropdown notification panel, per-item mark-read + mark-all-read
- Wire all event trigger points that are currently calling `notificationsRepository.create` directly — no new trigger sites needed for items already implemented (ERC, invitations, VM suggestions); dormant journey and journey completion triggers to be wired in their respective future modules

## Capabilities

### New Capabilities
- `notification-list`: `GET /api/v1/notifications` — cursor-paginated list of own notifications (unarchived by default), with actor, eventType, resourceType, resourceId, readAt, createdAt
- `notification-read`: `PATCH /api/v1/notifications/:id/read` and `POST /api/v1/notifications/read-all` — mark individual or all notifications as read
- `notification-archive-job`: 90-day soft-archive cron job — runs daily, sets `archivedAt` on notifications older than 90 days
- `notification-bell`: Frontend bell icon in header with unread count badge, notification panel with list, click-to-read, mark-all-read

### Modified Capabilities
- `erc-select`: no spec-level behavior change (notification creation was already specced; this change only makes notifications visible — no new events)

## Impact

- **Backend files modified**: `notifications.module.ts` (add service, controller, ScheduleModule), `app.module.ts` (import NotificationsModule, ScheduleModule)
- **Backend files created**: `notifications.service.ts`, `notifications.controller.ts`, `dto/list-notifications.dto.ts`, `notifications.cron.ts`
- **Frontend files modified**: `components/layout/header.tsx` (add bell), `lib/api/` (add notifications.ts)
- **Frontend files created**: `components/layout/notification-bell.tsx`, `components/layout/notification-panel.tsx`
- **Dependencies**: `@nestjs/schedule` is already in the approved library catalog — no new packages needed
- **No schema changes**: `Notification` model and `NotificationEventType` enum are fully complete in schema.prisma; `archivedAt` field already exists
