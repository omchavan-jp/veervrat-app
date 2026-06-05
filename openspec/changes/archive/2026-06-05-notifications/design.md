## Context

The `Notification` Prisma model and `NotificationEventType` enum are complete. `NotificationsRepository` already exists and is exported for other modules — ERC approval, VM suggestions, invitations, and custom ERC all call `notificationsRepository.create()` today. What is missing is: a service layer, an HTTP controller to expose the list/read API, a scheduled job to archive old notifications, and the frontend bell + panel.

`@nestjs/schedule` is already in the approved Platform Engineering Standard catalog. No new dependencies are needed.

## Goals / Non-Goals

**Goals:**
- `GET /api/v1/notifications` — cursor-paginated list of own notifications (excludes `archivedAt IS NOT NULL` by default)
- `PATCH /api/v1/notifications/:id/read` — mark a single notification read
- `POST /api/v1/notifications/read-all` — mark all unread notifications for the calling user as read
- Daily cron job — set `archivedAt = now()` on notifications where `createdAt < now() - 90 days` AND `archivedAt IS NULL`
- Frontend bell icon in the Header with live unread count badge (polling via TanStack Query)
- Notification panel dropdown listing recent notifications, click-to-mark-read, mark-all button

**Non-Goals:**
- Real-time WebSocket push for new notifications (spec says in-app bell polling; WebSocket notifications are a chat concern in item 20)
- Email delivery (separate concern for Resend integration — current implementation is fire-and-forget DB writes only)
- Notification preferences / opt-out toggles (item 32 account settings)
- Push notifications (explicitly out of scope in spec/25)

## Decisions

### 1. NotificationsService wraps the repository — no business logic bypass
The existing modules call `notificationsRepository.create()` directly because `NotificationsService` didn't exist. This stays as-is for now — the service is new and its `create()` is a thin delegation to the repo. Refactoring the call sites (ERC, invitations, VM) to call the service instead would be a cross-cutting change with high noise and zero behaviour change. The repository export contract is unchanged.

**Alternative considered**: Introduce an event bus (NestJS EventEmitter) so callers emit an event and the notification system subscribes. Rejected — higher complexity for v1, EventEmitter approach is spec'd for v2 decoupled communication. The direct repository call is explicitly acceptable per Backend Conventions §13 ("for async/decoupled communication... use NestJS EventEmitter as a starting point").

### 2. Cursor is `createdAt:id` composite (ISO timestamp + UUID suffix)
Cursor-based pagination on `createdAt DESC` risks duplicate cursors when two notifications have the exact same timestamp. The cursor encodes both `createdAt` (ISO string) and `id` (UUID), decoded server-side to a Prisma `where` clause: `{ OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: cursorId } }] }`. This gives stable, gapless pagination.

**Alternative considered**: offset-based. Rejected per API Conventions — cursor is the default for list endpoints.

### 3. `read-all` is a Prisma `updateMany` — not per-row
`POST /api/v1/notifications/read-all` issues a single `updateMany` where `{ recipientId, readAt: null }` — sets `readAt = now()` in one query. This is safe: at most it touches the caller's own rows, the service verifies the calling user's identity from session.

### 4. Unread count: separate `GET /api/v1/notifications/unread-count` endpoint
The frontend badge needs only a count, not the full list. A dedicated count endpoint (`SELECT COUNT(*)`) is cheaper than fetching a full page and measuring its length. The frontend polls this every 30 seconds via TanStack Query `refetchInterval`.

**Alternative considered**: include count in the list response `meta`. Rejected — the bell always polls the count independently; coupling it to the list would force a full page fetch just to update the badge.

### 5. Frontend notification panel as a shadcn Popover, not a page
The spec says "panel" / "dropdown" — not a separate route. A `Popover` from shadcn/ui triggered by the bell button is the right primitive: accessible, keyboard-navigable, closes on outside click. The panel renders the last 20 notifications with infinite scroll loading more on scroll.

### 6. `@nestjs/schedule` — single cron at 03:07 daily
The archive job runs daily at 03:07 (off-peak, avoids the :00 round number convention from Platform-Engineering-Standard). It issues a single `updateMany` to set `archivedAt` on notifications older than 90 days. Single-instance safe per spec/platform standard (no horizontal scaling in v1).

## Risks / Trade-offs

- **Race condition on `read-all`**: Two concurrent `read-all` requests could both issue `updateMany` — idempotent by design (second call finds no unread rows, does nothing). No risk.
- **Cron drift on single instance**: If the server restarts mid-night, the archive job may not fire until the next day. Impact: a handful of notifications stay visible one extra day — negligible. Acceptable at v1 scale.
- **Polling unread count**: 30-second polling means a slight lag on receiving new notifications in the badge. Acceptable per spec (no real-time requirement for bell). WebSocket push can be added later.
- **Existing callers bypass NotificationsService**: `ErcService`, `InvitationsService`, etc. call `notificationsRepository.create()` directly. This means the new service's `create()` is not the single entry point today. Not a correctness issue — repository is idempotent. A future refactor can consolidate this.
