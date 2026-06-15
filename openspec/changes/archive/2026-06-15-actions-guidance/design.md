## Context

Item 21 adds two aggregated "what needs my attention?" work-queues — one for the Vratarthi (`/actions`) and one for the Vratmitra (`/vratmitra/guidance`). The underlying mutation flows already exist:

- **ERC closure:** VA submits an item (`PATCH .../status` → `SUBMITTED`); VM approves (`POST .../approve` → `APPROVED`) or returns it (`POST .../revisit` → `REVISIT`). (`erc.service.ts`)
- **VM suggestions:** VM suggests a pool item (`POST .../suggest`) creating a `VmSidenote` (active = `revokedAt IS NULL`); VA acknowledges (`acknowledgedAt`). (`VmSidenote` model)
- **Journey completion:** VA submits (`POST :id/complete`); VM approves (`POST :id/complete/approve` → `completedAt` set). (`journeys.service.ts`)
- **Custom ERC review:** author submits (`CustomErcReview` row, `status = pending`); moderator approves/rejects. (`CustomErcReview` model)

What's missing is a **read/aggregation layer** that rolls these per-journey signals into a single prioritized list per user, plus the two UI pages and conditional VM navigation. The current `/actions` page reads the notifications feed instead of live state — it will be replaced.

The existing `/actions` page reads `notificationsApi`; screen-spec 4 + the Implementation-Order directive both call for aggregation from **live pending state**. Notifications are events (they get marked read and disappear); the work-queue must reflect the *current* truth even across sessions and reloads.

## Goals / Non-Goals

**Goals:**
- `GET /api/v1/actions` returns a VA's pending items grouped by the five screen-spec-4 sections, aggregated across all their journeys from live state.
- `GET /api/v1/vm-actions` returns a VM's pending items grouped by the four screen-spec-5 sections, **strictly scoped** to journeys the requester is assigned to (journey VM) or owns globally (global VM).
- Both endpoints return a `counts` summary so nav badges need only this one call.
- Rebuild `/actions` and build `/vratmitra/guidance` with all four UI states (loading/empty/error/success), responsive, fully i18n.
- VM nav items appear only for users with an active VM assignment; each nav item shows an independent pending count.
- Inline Approve/Return (with note) on VM closure requests; reuse existing ERC approve/revisit endpoints for the mutations.

**Non-Goals:**
- No new mutation endpoints — the pages invoke existing approve/revisit/acknowledge/suggest endpoints.
- `/my-vratarthis` page itself is **not** built here (it's screen-spec under VM side; this item only adds its nav entry + the Guidance page). Building the full two-panel My Vratarthis page is deferred and recorded.
- No realtime push for the queues — TanStack Query invalidation on the relevant mutations is sufficient for v1.
- Moderation custom-ERC *review actions* are item 28; here the VM only sees **read-only status** of custom ERCs they/their VAs submitted.

## Decisions

### 1. New `actions` module rather than extending `journeys`/`erc`
The aggregation spans ERC, journeys, sidenotes, custom-ERC reviews, and VM relationships — it belongs to none of them. A dedicated `actions` module (controller → service → repository) keeps each source module cohesive. Cross-module scoping (which journeys a VM is assigned to) goes through `VmRelationshipsService`/`JourneysService`, never a foreign repository (CLAUDE.md hard rule). The `actions.repository.ts` may query the shared Prisma models directly for read aggregation (repositories own Prisma), but ownership-scoping inputs (journey IDs the VM may see) are supplied by the relationship service.

### 2. Persist journey completion-pending state — new nullable `Journey.completionSubmittedAt`
**Problem:** `submitCompletion` leaves the journey `ACTIVE` and only fires a notification; there is no persisted flag distinguishing "active" from "completion submitted, awaiting VM." The VM guidance queue's "journey completion requests" section cannot be derived from live state without it.

**Decision:** add nullable `completionSubmittedAt DateTime?` to `Journey` (additive migration). `submitCompletion` sets it when a VM approval is required; `approveCompletion` and `setCompleted` clear it (and set `completedAt`). The VA Actions "journey closure pending" and VM Guidance "journey completion requests" sections both read this column.

**Alternatives considered:** (a) Derive from the `JOURNEY_COMPLETION_SUBMITTED` notification — rejected: notifications are the event feed, get marked read, and the Cautions doc warns against conflating events with state. (b) A new `JourneyState.PENDING_COMPLETION` enum value — rejected: heavier (touches every state-machine branch and existing transition tests) for no extra signal; a timestamp is the minimal honest representation and matches the existing `completedAt`/`startedAt`/`submittedAt` timestamp idiom.

### 3. `(vratmitra)` route group must render inside the app shell
The current `(vratmitra)/layout.tsx` only wraps children in `NextIntlClientProvider` — no sidebar, no auth gate. Per the audit-remediation lesson (VA chat broke because it lived in a shell-less group) and Cautions §4 ("place screens in the correct structural group"), `/vratmitra/guidance` must render with the same shell as `(app)`. Decision: have the `(vratmitra)` layout reuse the shared `AppLayoutClient` (extract it so both route groups share one shell), so VM pages get the rail, auth gate, and providers. The shell renders the conditional VM nav items.

### 4. VM nav visibility via a lightweight `useIsVm` signal
The shell needs to know whether to show VM nav items. Reuse `GET /api/v1/vm-relationships/my-vratarthis`-style data, or expose a minimal `hasActiveVmAssignment` flag. Decision: the `vm-actions` endpoint already computes the VM's assigned journeys; surface a tiny `GET /api/v1/vm-actions/summary` (or include counts in the main call and gate nav on "endpoint returns assignments"). To avoid an extra round-trip and keep nav cheap, add `hasVmAssignments` + `pendingCount` to the existing `me`/session payload-adjacent query is overkill; instead the shell calls the lightweight vm-actions count query (TanStack Query, cached) and shows nav only when `assignmentsExist`. Badge counts come from the same query, invalidated on VM-relationship and approval mutations.

### 5. Read-only vs. actionable sections
Per screen-specs, only some sections carry actions:
- **VA `/actions`:** *VM suggestions awaiting decision* → Accept/Dismiss (existing acknowledge / dismiss); all other sections are navigational (click → ERC/journey).
- **VM `/vratmitra/guidance`:** *closure requests* → Approve/Return + inline note (existing `approve`/`revisit`); *journey completion requests* → Approve (existing `complete/approve`); *suggestion status* and *custom-ERC review status* are read-only.

## Risks / Trade-offs

- **[Aggregation N+1 / fan-out across journeys]** → The repository batches per-source queries with `journeyId IN (...)` over the user's journey set, not per-journey loops. Counts computed in the same pass.
- **[New `completionSubmittedAt` must stay consistent with `completedAt`]** → Centralize the three writers (`submitCompletion`, `approveCompletion`, self-approve `setCompleted`) so the flag is always cleared on completion; covered by service unit tests including the no-VM self-approve path.
- **[VM endpoint authorization is the security-critical surface]** → Scope is computed from persisted `JourneyVmAssignment` / `VmRelationship` (active, not ended), never from a client-supplied journey/VA id. Auth-matrix tests: assigned VM sees only their VAs' items (positive); unrelated VM sees nothing for a journey they're not on (negative).
- **[Replacing the existing `/actions` page]** → The old notifications-filter view is removed; the notification bell still provides the event feed, so no capability is lost. Confirm no other route links assumed the old behavior (only the nav links to `/actions`).
- **[`(vratmitra)` shell refactor could regress the existing VM route stubs]** → Stubs are `.gitkeep` only; extracting the shared shell is low-risk but the change is verified by rendering `/vratmitra/guidance` with the rail present (the exact regression guard from the chat fix).

## Migration Plan

1. Additive Prisma migration: `add_journey_completion_submitted_at` (nullable, no backfill needed — existing pending completions are rare in local dev and will resolve on next submit). Apply to dev DB (5433) and test DB (5434).
2. Ship backend module + endpoints, then frontend pages + nav, then tests. No rollback complexity — the column is nullable and the endpoints are additive reads.
