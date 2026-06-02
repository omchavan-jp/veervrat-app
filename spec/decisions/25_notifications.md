# Notification System
_Last updated: 2026-06-02 | Round: R1_

## Confirmed Decisions

### Delivery Channels
- **In-app:** bell icon in nav with unread count badge. Clicking opens a notification panel/page.
- **Email:** via Resend. Per-event opt-out available (some events email by default, can be disabled in settings).
- Per-VM chat email toggle: already specced in `decisions/18_my-vratmitras-chat.md`.

### Notification Data Model
Each notification has:
- `id`, `created_at`
- `recipient_id` — user receiving the notification
- `actor_id` (nullable) — user who triggered the event (null for system events)
- `event_type` (enum) — canonical event name
- `resource_type` + `resource_id` — polymorphic reference to the relevant entity
- `read_at` (nullable) — null = unread
- `dismissed_at` (nullable) — dismissed without reading

### Notification Events (v1)

| Event | Recipient | Email default |
|---|---|---|
| VM invitation received | Invitee | ✅ |
| VM invitation accepted | VA (sender) | ✅ |
| VM invitation declined | VA (sender) | ✅ |
| VM invitation expired | VA (sender) | ✅ |
| Invitee joined platform (expired invite) | VA (original inviter) | ✅ |
| Journey went dormant | VA + assigned VM | ✅ |
| New ERC available (weakness attached mid-journey) | VA | ❌ (in-app only) |
| ERC closure submitted (VA submitted) | Assigned VM | ✅ |
| ERC closure approved (VM approved) | VA | ✅ |
| ERC returned to revisit | VA | ✅ |
| Journey completion submitted (VA submitted) | Assigned VM | ✅ |
| Journey completion approved | VA | ✅ |
| Custom ERC submitted for global review | Moderator (any) | ✅ |
| Custom ERC approved by moderator | VA + VM (submitters) | ✅ |
| Custom ERC rejected by moderator | VA + VM (submitters) | ✅ |
| New VM suggestion (VM suggested ERC) | VA | ❌ (in-app only) |
| VM suggestion rejected by VA | VM | ❌ (in-app only) |
| New blog comment on own blog | Blog author | ❌ (in-app only) |
| Comment reported | Moderator (any) | ❌ (in-app only) |
| New follower | Followed VA | ❌ (in-app only) |
| Chat message received | Recipient | configurable per VM (see chat spec) |
| Global VM withdrawal (VM left) | VA | ✅ |
| Journey VM withdrawal (VM left) | VA | ✅ |

### In-App Notification Panel
- Bell icon in nav. Unread count badge.
- Panel shows notifications in reverse chronological order.
- Each notification: actor avatar (if applicable), event description, resource name, timestamp.
- Clicking a notification navigates to the relevant entity and marks it as read.
- "Mark all as read" action.
- Pagination or infinite scroll for older notifications.
- Notifications are not deleted — they persist indefinitely (soft-dismissible).

### Email Opt-Out
- Per-event-type opt-out available from account settings.
- Some events are always in-app only (no email option) — marked above.
- Chat-specific email toggle is per-VM (see `decisions/18_my-vratmitras-chat.md`).

## Open Questions (area-specific)
- Notification retention: **90 days**. Notifications older than 90 days are soft-archived (not deleted, but hidden from panel by default).
- Push notifications (web browser push) — out of scope for v1.
