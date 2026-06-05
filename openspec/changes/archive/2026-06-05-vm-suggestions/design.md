## Context

The `VmSidenote` table already exists in the schema with `journeyExposureId`, `journeyResolutionId`, `journeyChallengeId` foreign keys (one-to-one unique per ERC item), `text`, `acknowledgedAt`, `revokedAt`, `vmId`, and `entityType`. All notification event types (`VM_SUGGESTION_NEW`, `VM_SUGGESTION_DISMISSED`) and the `ErcEntityType` enum (`EXPOSURE`, `RESOLUTION`, `CHALLENGE`) are already in the schema. The `erc.suggest` permission case is already implemented in `has-permission.ts`. `NotificationsRepository` is already injected in `ErcService`.

The only work is: repository methods for sidenote CRUD, service methods for suggest/unsuggest/acknowledge with business rules, controller endpoints, and updated list/findById selects to include sidenote data.

## Goals / Non-Goals

**Goals:**
- VM can create a sidenote on any journey ERC item they are assigned to (one sidenote per item — upsert on re-suggest)
- VM can revoke a sidenote; revocation nullifies `acknowledgedAt` if VA had already acknowledged
- VA can acknowledge a sidenote (sets `acknowledgedAt`)
- `listJourneyItems` and `findById` include `vmSidenote` in response
- `VM_SUGGESTION_NEW` notification to VA on suggest; `VM_SUGGESTION_DISMISSED` on unsuggest
- All 3 ERC types (exposure, resolution, challenge) covered via the same service methods

**Non-Goals:**
- VA "reject/dismiss" sidenote (spec says dismiss removes the sidenote — that is the VM's unsuggest action, not VA's)
- Sidenote editing (text change = unsuggest + re-suggest)
- Pool-level suggestions (sidenotes attach to journey ERC items only, not pool items)

## Decisions

**One sidenote per ERC item (upsert on re-suggest):** The schema has a unique FK per item. If a VM suggests again on an already-suggested item, upsert: update `text`, clear `revokedAt`, clear `acknowledgedAt`. This matches the spec intent that VM can change their suggestion.

**Revocation sets `revokedAt`, nullifies `acknowledgedAt` — does not hard delete:** Keeps audit trail. The response still includes the sidenote object with `revokedAt` set so the UI can filter it out. The `listJourneyItems` select returns active sidenotes only (where `revokedAt IS NULL`) to keep the response clean.

**`erc.suggest` permission already handles the VM-assigned-to-journey check:** `getJourneyAndCheckPermission` helper in ErcService already accepts the action string union — just add `'erc.suggest'` and `'erc.acknowledge'` (a new action for the VA acknowledge path which maps to `erc.select` scope).

**VA acknowledge uses `erc.select` scope check:** VA must own the journey to acknowledge. Re-using the `erc.select` path in `getJourneyAndCheckPermission` (VA journey owner) is correct — no new permission entry needed.

**`ErcEntityType` enum for sidenote.entityType:** Map `'exposure' → ErcEntityType.EXPOSURE`, etc. at the service layer when creating sidenotes.

## Risks / Trade-offs

**[Risk] Stale `acknowledgedAt` if sidenote is revoked and re-created:** Upsert on re-suggest always clears `acknowledgedAt` — so VA must re-acknowledge after a VM changes their sidenote text. This is correct behavior (new text = new suggestion).

**[Risk] `listJourneyItems` select change is additive but touches existing type:** `JourneyErcItem` type in `erc.repository.ts` gains an optional `vmSidenote` field. All existing callers receive `undefined`/`null` for this field — non-breaking.
