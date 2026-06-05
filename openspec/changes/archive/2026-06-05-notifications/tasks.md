## 1. Backend — NotificationsModule wiring

- [x] 1.1 Install `@nestjs/schedule` package in `apps/api` and register `ScheduleModule.forRoot()` in `AppModule`
- [x] 1.2 Add `NotificationsModule` to `AppModule` imports (currently absent — module exists but is not imported globally)
- [x] 1.3 Add `NotificationsService` to `notifications.module.ts` (providers + exports); keep `NotificationsRepository` exported

## 2. Backend — NotificationsService

- [x] 2.1 Create `apps/api/src/modules/notifications/notifications.service.ts` with `create(recipientId, actorId, eventType, resourceType, resourceId)` delegating to repository
- [x] 2.2 Add `listForUser(userId, cursor?, pageSize?)` — returns paginated notifications (exclude `archivedAt IS NOT NULL`) with composite cursor `createdAt:id`
- [x] 2.3 Add `getUnreadCount(userId)` — returns count where `readAt IS NULL AND archivedAt IS NULL`
- [x] 2.4 Add `markRead(userId, notificationId)` — finds notification, enforces ownership (throws 403 if recipient ≠ caller), sets `readAt` if null (idempotent)
- [x] 2.5 Add `markAllRead(userId)` — `updateMany` where `{ recipientId: userId, readAt: null }`, returns updated count
- [x] 2.6 Write unit tests for `NotificationsService` in `notifications.service.spec.ts` covering: list pagination, unread count, markRead ownership check, markRead idempotency, markAllRead with/without unread items

## 3. Backend — NotificationsController

- [x] 3.1 Create `apps/api/src/modules/notifications/dto/list-notifications.dto.ts` with optional `cursor: string` and `pageSize: number` (default 20, max 100)
- [x] 3.2 Create `apps/api/src/modules/notifications/notifications.controller.ts` with:
  - `GET /notifications/unread-count` → `notificationsService.getUnreadCount` (must be before `:id` routes to avoid param collision)
  - `GET /notifications` → `notificationsService.listForUser`
  - `POST /notifications/read-all` → `notificationsService.markAllRead`
  - `PATCH /notifications/:id/read` → `notificationsService.markRead`
- [x] 3.3 Apply `SessionAuthGuard` to all routes in the controller
- [x] 3.4 Register controller in `notifications.module.ts`

## 4. Backend — NotificationsRepository additions

- [x] 4.1 Add `listForUser(userId, cursor?, pageSize)` to `NotificationsRepository` — Prisma query with `where: { recipientId, archivedAt: null }`, composite cursor, `include: { actor: { select: { id, displayName, avatarUrl } } }`, `orderBy: { createdAt: 'desc' }`
- [x] 4.2 Add `countUnread(userId)` to `NotificationsRepository`
- [x] 4.3 Add `markRead(id)` — `update` where `{ id }`, `data: { readAt: new Date() }` (only if `readAt === null` — use `updateMany` with `readAt: null` filter for idempotency)
- [x] 4.4 Add `markAllRead(userId)` — `updateMany` where `{ recipientId: userId, readAt: null }`
- [x] 4.5 Add `archiveOlderThan(date)` — `updateMany` where `{ createdAt: { lt: date }, archivedAt: null }`, sets `archivedAt: new Date()`

## 5. Backend — Archive Cron Job

- [x] 5.1 Create `apps/api/src/modules/notifications/notifications.cron.ts` — `@Injectable()` class with `@Cron('7 3 * * *')` method calling `notificationsRepository.archiveOlderThan(ninetyDaysAgo)`, structured log on start/success/failure
- [x] 5.2 Register `NotificationsCron` in `notifications.module.ts` providers
- [x] 5.3 Write unit test for `NotificationsCron.archiveOld()` — mocks `notificationsRepository.archiveOlderThan`, verifies it is called with a date 90 days before now (±1 second tolerance)

## 6. Frontend — Notifications API client

- [x] 6.1 Create `apps/web/lib/api/notifications.ts` with types: `NotificationItem` (id, eventType, resourceType, resourceId, readAt, createdAt, actor), `NotificationsListResponse`, `UnreadCountResponse`
- [x] 6.2 Add `notificationsApi` object: `list(cursor?)`, `getUnreadCount()`, `markRead(id)`, `markAllRead()`
- [x] 6.3 Add query keys to `apps/web/lib/api/query-keys.ts`: `notifications.list`, `notifications.unreadCount`

## 7. Frontend — NotificationBell component

- [x] 7.1 Create `apps/web/components/layout/notification-bell.tsx` as a `'use client'` component
- [x] 7.2 Use `useQuery` with `queryKey: notifications.unreadCount`, `queryFn: notificationsApi.getUnreadCount`, `refetchInterval: 30_000` for the badge count
- [x] 7.3 Render a `Bell` icon (lucide-react) wrapped in a shadcn `Button` variant="ghost". Show a badge `<span>` with the count when `count > 0`
- [x] 7.4 Wrap in a shadcn `Popover` — trigger is the bell button, content is `NotificationPanel`

## 8. Frontend — NotificationPanel component

- [x] 8.1 Create `apps/web/components/layout/notification-panel.tsx` as a `'use client'` component
- [x] 8.2 Use `useQuery` with `queryKey: notifications.list`, `queryFn: () => notificationsApi.list()` to fetch the first page (20 items)
- [x] 8.3 Render the "Mark all as read" button at the top — calls `notificationsApi.markAllRead()` via `useMutation`, then invalidates both `notifications.list` and `notifications.unreadCount` queries
- [x] 8.4 Render each `NotificationItem` — show a filled dot for unread, actor name (or "System"), a human-readable event label derived from `eventType` (static map: `VM_INVITATION_RECEIVED → "New VM invitation"`, etc.), and relative time (use `date-fns` `formatDistanceToNow`)
- [x] 8.5 On notification item click: call `notificationsApi.markRead(id)` via mutation, invalidate queries; if `resourceId` exists navigate to the resource (use a static `eventTypeToPath(eventType, resourceId)` helper returning the appropriate route)
- [x] 8.6 Empty state: "No notifications yet" when list is empty
- [x] 8.7 Write Vitest + RTL unit test for `NotificationPanel` covering: renders unread dot for unread item, mark-all-read button calls correct API, empty state renders; apply `vi.hoisted()` for mocks, `fireEvent` not `userEvent` when fake timers are active

## 9. Frontend — Wire bell into Header

- [x] 9.1 Import `NotificationBell` into `apps/web/components/layout/header.tsx` and add it to the right side of the header (between `LanguageToggle` and the user display name span)
- [x] 9.2 Add i18n strings: `notifications.markAllRead`, `notifications.empty`, `notifications.unread` — add to `messages/en.json` and `messages/mr.json`

## 10. Tests — Auth matrix

- [x] 10.1 In `notifications.service.spec.ts`: verify `markRead` throws `AccessDeniedException` when caller is not the notification recipient (negative auth matrix test)
- [x] 10.2 In `notifications.service.spec.ts`: verify `listForUser` returns only the calling user's notifications, never another user's (positive auth matrix test)
