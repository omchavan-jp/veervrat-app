## Context

ERC items follow a state machine (`not_started → in_progress → submitted → approved`, or `submitted → revisit`). The existing `PATCH :itemId/status` route handles the VA side (start, submit, self-approve). REVISIT and VM-side APPROVED are placeholder-blocked pending this change (item 15).

Journey completion (`state → COMPLETED`) similarly has no endpoint yet — the `journey.complete` permission is defined but nothing calls it.

The `erc.approve_closure` permission in `has-permission.ts` is fully implemented and handles both self-approve (VA, no VM) and VM-approve paths. The `Notification` model and all five `NotificationEventType` values needed here already exist in the schema.

## Goals / Non-Goals

**Goals:**
- VM can approve or return-for-revisit any SUBMITTED ERC item on a journey they're assigned to
- VA can submit journey for completion; VM (or VA self when no VM) can approve the completion
- Notification row is written on each event (approve, revisit, journey completion submitted/approved)
- `erc.service.spec.ts` REVISIT placeholder test is replaced with correct VM-positive + VA-negative tests

**Non-Goals:**
- Email notifications (only in-app DB rows for this item)
- Frontend screens for VM approval
- Bulk approval endpoints
- Checking that all ERC items are approved before allowing journey completion (spec does not require this guard)

## Decisions

### Separate VM endpoints instead of extending PATCH /status

The existing `PATCH :itemId/status` is guarded by `erc.select` — a VA-owner-only check that blocks VMs at the method level. Extending it with a role fork would require loosening the top-level guard and adding complex branching for every caller. Separate `POST :itemId/approve` and `POST :itemId/revisit` endpoints are cleaner, easier to permission-check individually, and map cleanly to the intent: VM acts, not VA editing their own submission.

### Notifications via a thin NotificationsModule (not EventEmitter)

Options:
1. NestJS EventEmitter (fire-and-forget publish)
2. Direct `prisma.notification.create()` calls in services (violates repository rule)
3. `NotificationsRepository` in a new `NotificationsModule`

Option 3 is chosen. It keeps Prisma out of services, creates a minimal module boundary, and allows future expansion (WebSocket push, email trigger) without touching service code.

The `NotificationsModule` exports `NotificationsRepository`. ErcModule and JourneysModule import it. No events bus is needed at this scale.

### Journey completion: two separate endpoints (submit + approve)

`POST /api/v1/journeys/:id/complete` — VA submits for completion. This does **not** move state to COMPLETED directly; instead, it transitions state to a conceptual "pending-completion" state.

However, the schema has no `COMPLETION_SUBMITTED` JourneyState — only `COMPLETED`. Per spec, the VA submitting and the VM approving both lead to `COMPLETED`. The distinction is:
- VA self-approve (no VM): `POST /complete` moves to COMPLETED immediately
- With VM: `POST /complete` is the "submit" intent; `POST /complete/approve` (VM) moves to COMPLETED

To avoid adding a new schema state, the `POST /complete` endpoint by the VA **both** writes the notification (`JOURNEY_COMPLETION_SUBMITTED` → VM) **and** immediately moves to COMPLETED if no VM is assigned. If a VM is assigned, it returns `202 Accepted` signalling "awaiting VM approval" without changing state (the journey stays ACTIVE). The VM then calls `POST /complete/approve` to actually set COMPLETED.

This avoids a schema migration while preserving the two-actor intent from the spec. The trade-off: journey state alone cannot distinguish "VA submitted for completion but VM hasn't approved yet" from "still actively working" — but the spec does not require this distinction to be persisted.

### Permission checks

- ERC approve: `hasPermission(user, { type: 'erc', journey: slim, erc: {...} }, 'erc.approve_closure')`
- ERC revisit: only a VM assigned to the journey — use `isVm(user) && isActiveJourneyVm(user, slim)` (no existing permission key for revisit; add `erc.revisit` to `has-permission.ts`)
- Journey submit for completion: `hasPermission(user, { type: 'journey', journey: slim }, 'journey.complete')` (VA path)
- Journey approve completion: same permission, VM path

### Item must be SUBMITTED to approve/revisit

Both approve and revisit verify the current status is SUBMITTED. If not → `InvalidErcStatusTransitionException`.

### Deactivated items

Deactivated items cannot be approved or revisited — same guard as existing status update.

## Risks / Trade-offs

- **No schema for "completion pending" state** → The VA "submitted for completion" intent is only observable via the notification row, not via a dedicated journey state field. This is a known trade-off; adding a `COMPLETION_PENDING` JourneyState would require a migration and is deferred.
- **`erc.revisit` is a new permission key** → Must add to `has-permission.ts` and document in spec/decisions/05. Simple addition; low risk.
- **Notification writes are synchronous** → If the DB write for the notification fails, the whole approval request fails. This is the safest failure mode (no phantom approvals without notification) and acceptable at current scale.
