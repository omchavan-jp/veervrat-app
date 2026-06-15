## Why

Vratarthis and Vratmitras currently have no single place that answers "what needs my attention right now?" The existing `/actions` page is only a filtered notifications feed — it reflects *events that happened*, not the *live pending state* of a user's journeys. A VA cannot see, in one aggregated view, which ERC items were returned for revisit, which VM suggestions await their decision, or which closures are pending. A VM has no view at all of the approvals their mentees are waiting on. Item 21 (Implementation Order, Tier 4) closes this gap with two purpose-built, aggregated work-queues.

## What Changes

- **Backend:** New `actions` module exposing `GET /api/v1/actions` (VA work-queue) and `GET /api/v1/vm-actions` (VM work-queue). Both aggregate from **live persisted state** (ERC status, journey state, VM suggestions/sidenotes, custom-ERC review status) — not from the notifications table. The VM endpoint is strictly scoped to journeys the requesting user is assigned to (journey VM) or owns as global VM.
- **Frontend:**
  - Rebuild `/actions` (VA) as a grouped single-column work-queue sourced from `GET /actions`, per screen-spec 4: *ERC returned for revisit → VM suggestions awaiting decision → pending VM approvals (read-only) → new ERC available → journey closure pending*, most-urgent first. (Replaces the current notifications-filter implementation.)
  - New `/vratmitra/guidance` (VM) page sourced from `GET /vm-actions`, per screen-spec 5 + spec/22: *closure requests awaiting approval (Approve/Return + inline note) → journey completion requests → suggestion status updates (read-only) → custom ERC review status (read-only)*.
- **Navigation:** Add VM nav items (**My Vratarthis**, **VM Guidance**) to the app shell, visible **only** to users who hold an active VM assignment (global or journey-level); hidden entirely otherwise. Each nav item carries its own independent pending-count badge (VA Guidance count vs. VM Guidance count — no combined badge).

## Capabilities

### New Capabilities
- `va-actions-endpoint`: `GET /api/v1/actions` — aggregates a VA's pending items across all their journeys from live state (ERC revisit, suggestions awaiting decision, pending VM approvals, new ERC available, journey closure pending), with a per-section count summary for the nav badge.
- `vm-actions-endpoint`: `GET /api/v1/vm-actions` — aggregates a VM's pending items across journeys they are assigned to (closure requests awaiting approval, journey completion requests, suggestion status updates, custom-ERC review status), strictly relationship-scoped per `erc.approve_closure` / `journey.complete`.
- `va-actions-page`: `/actions` grouped work-queue UI (all four states, responsive, i18n), replacing the notifications-filter page.
- `vm-guidance-page`: `/vratmitra/guidance` grouped work-queue UI with inline Approve/Return actions on closure requests.
- `vm-nav-visibility`: Conditional VM nav items in the app shell, shown only to users with active VM assignments, each with an independent pending-count badge.

### Modified Capabilities
<!-- No spec-level requirement changes to existing capabilities. The existing ERC approval, VM-suggestions, and journey-completion endpoints already provide the mutation actions these pages invoke; this change only adds aggregation/read endpoints and UI that consume them. -->

## Impact

- **New backend module:** `apps/api/src/modules/actions/` (`actions.module.ts`, `actions.controller.ts`, `actions.service.ts`, `actions.repository.ts`, `dto/`). Reads via its own repository; cross-module dependencies (e.g. VM-relationship scoping) go through services, never foreign repositories.
- **Frontend routes:** rebuilt `apps/web/app/(app)/actions/page.tsx`; new `apps/web/app/(vratmitra)/vratmitra/guidance/page.tsx` (under the `(vratmitra)` route group, which must render inside the app shell — see design); new `lib/api/actions.ts` client + query keys.
- **Shell/nav:** `apps/web/app/(app)/layout-client.tsx` (or shared nav) gains conditional VM nav items + badges driven by a VM-assignment check.
- **Permissions:** exercises existing rows `erc.approve_closure`, `journey.complete`, `erc.suggest`, `global_vm.view_va_guidance` — no new permission rows. Auth-matrix tests add positive + negative coverage for the VM endpoint's relationship scoping.
- **No new dependencies.** No schema changes (all data already persisted).
- **Notifications:** unaffected — the bell remains the event feed; Actions/Guidance become the live work-queues.
