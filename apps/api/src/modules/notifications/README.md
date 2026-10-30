# notifications

## Overview

Notifications persist recipient events, expose inbox operations and optionally dispatch email. [notifications.service.ts:NotificationsService] [notifications.controller.ts:NotificationsController]

## Interface

- Session-protected endpoints list notifications, count unread, mark one read or mark all read. [notifications.controller.ts:NotificationsController]
- notificationLinkPath maps event and resource context to frontend paths used by inbox and email. [notification-link.ts:notificationLinkPath]
- [dto](./dto/README.md): Notification list query validates cursor and page size.

## Invariants

- Lists exclude archived notifications and order by creation time and ID descending with cursor pagination capped at 100; unread count excludes archived rows. [notifications.repository.ts:listForUser] [notifications.repository.ts:countUnread]
- Marking one read requires the caller to be its recipient. Email is skipped for inactive users, opted-out events, ineligible events or skipEmail. [notifications.service.ts:markRead] [notifications.service.ts:create] [notifications.service.ts:sendEmail]

## Side Effects

- Creates and marks notifications in Prisma and queues eligible rendered emails asynchronously. [notifications.repository.ts:create] [notifications.service.ts:sendEmail]
- Daily 03:07 cron archives notifications older than 90 days. [notifications.cron.ts:archiveOld] [notifications.repository.ts:archiveOlderThan]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
