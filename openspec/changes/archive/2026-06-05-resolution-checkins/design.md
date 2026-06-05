## Context

The `ResolutionCheckin` model and `CheckinStatus` enum (`done | partial | missed`) already exist in `schema.prisma` with a `resolution_checkins` table. The `JourneyResolution` model already has a `checkins ResolutionCheckin[]` relation. No DB migration is needed.

The ERC module (`apps/api/src/modules/erc/`) currently handles exposures, resolutions, and challenges via a shared `ErcService` + `ErcRepository`. Three controllers (`ExposuresController`, `ResolutionsController`, `ChallengesController`) share the same service. Check-ins are resolution-specific and have no parallels in exposures/challenges, so they need dedicated endpoints nested under resolutions.

On the frontend, `resolutions-tab.tsx` renders `ErcItemCard` for each resolution — it already shows frequency/duration fields for resolutions but the "Log check-in" button is a disabled stub comment. The `JourneyErcItem` type in `lib/api/journeys.ts` does not include checkin-related fields yet.

## Goals / Non-Goals

**Goals:**
- VA can log a check-in (done/partial/missed + optional note) against any `in_progress` resolution they own
- VA can view the full check-in history for a resolution
- Streak is computed server-side: count of trailing consecutive `done` check-ins (calendar gaps irrelevant — no auto-missed)
- Frontend shows inline log form, expandable history, and streak badge on the resolution card
- Auth: only journey owner (VA) can POST check-ins; journey owner and assigned VM can GET history

**Non-Goals:**
- No check-in reminders or auto-missed enforcement (spec/24 explicitly prohibits)
- No check-in editing or deletion (not in spec)
- No VM check-in logging (VA only)
- No pagination on check-in history (short list per resolution; cursor pagination would be premature)

## Decisions

### D1: Add checkin endpoints to ErcModule, not a new module

**Decision:** Add `ResolutionCheckinsController`, `ResolutionCheckinsService`, `ResolutionCheckinsRepository` as new files inside `apps/api/src/modules/erc/` and register them in `ErcModule`.

**Rationale:** Check-ins are tightly scoped to resolutions, which already live in `erc/`. Creating a new NestJS module would require re-importing `AuthModule`, `JourneysModule`, and duplicating guard/repository boilerplate. The `erc/` module already owns resolution ownership checks and the `ErcRepository` for fetching items. Grouping them here keeps the surface small and consistent.

**Alternative considered:** New `resolution-checkins/` module. Rejected — adds a module boundary with no benefit given the tight coupling to `JourneyResolution`.

---

### D2: Streak calculated on every GET (not stored)

**Decision:** Compute streak at query time by fetching check-ins ordered by `checked_in_at ASC` and counting trailing `DONE` entries from the end of the list.

**Rationale:** Streaks are cheap to compute (small list per resolution), don't need to be indexed, and storing them would require updating the `JourneyResolution` row on every check-in POST — adding a write-path transaction. Spec/24 defines streak as "consecutive check-in submissions with done status" with no SLA on read performance. Computed-on-read is simpler and correct.

**Alternative considered:** Store `current_streak` on `JourneyResolution`. Rejected — premature optimization, adds mutation complexity.

---

### D3: Permission model — reuse existing `erc` resource type

**Decision:** POST check-in uses `erc.select` permission check (VA owner of journey). GET check-ins uses `journey.view` (VA owner or assigned VM). No new permission action needed.

**Rationale:** `erc.select` is already defined as "VA who owns the journey" which is the correct gate for check-in logging. `journey.view` covers read access including VM. Adding `checkin.log` / `checkin.view` would be new actions that map 1:1 to existing ones — unnecessary indirection.

---

### D4: Guard against logging check-ins on non-in_progress resolutions

**Decision:** Service-layer validation — if the `JourneyResolution` is not `IN_PROGRESS`, return 422 with `INVALID_CHECKIN_STATE` error.

**Rationale:** Spec/24: check-ins accumulate against an active resolution. `NOT_STARTED` means the VA hasn't started it; `SUBMITTED`/`APPROVED` means it's closed. Logging on non-in_progress resolutions would corrupt the log. A custom exception `InvalidCheckinStateException` fits cleanly alongside existing `InvalidErcStatusTransitionException`.

---

### D5: Frontend — inline form on the resolution card only (not a modal)

**Decision:** Show a compact inline form (3 toggle buttons: Done / Partial / Missed, optional note textarea, submit button) directly on the resolution card when `status === 'IN_PROGRESS'`. Check-in history is a collapsible section below the card actions.

**Rationale:** Spec/27 says "Log check-in button (done/partial/missed + note), check-in history expandable." An inline form avoids a modal stack and keeps the interaction lightweight. Toggle buttons for status (not a select) match the small surface.

## Risks / Trade-offs

- **Long check-in lists:** No pagination. If a VA logs daily for a year that's ~365 records — acceptable for a single resolution list fetch. If this becomes a concern it's a future scope.
- **Streak count display accuracy:** Streak is always fresh from server. If the user logs and the query refetches, they see the updated streak immediately (TanStack Query invalidation handles this).
- **Note length:** Not validated server-side beyond `String?`. Could add a max length DTO validator (e.g., 500 chars) — added as a DTO `@MaxLength` guard.
