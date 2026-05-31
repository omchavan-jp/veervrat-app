# Flows
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions

### Flow 1 — Study Your Weakness
- Entry: user browses weaknesses → selects one → takes test (all sentences of linked subvirtues) → sees results.
- Results screen: flagged sentences (Sometimes/Never) surfaced at top; all sentences shown below.
- From any sentence on the results screen, user can start a journey — no restriction based on score. Full freedom.

### Flow 2 — Work on Your Weakness (Dashboard)
- Single dashboard showing: ongoing journey stats + sentence suggestions.
- Suggestions (v1): lowest-scored sentences across all weaknesses from latest test results.
- Algorithm enhancement is a planned major future initiative — will affect suggestions and have broader application implications. Not in v1 scope.
- Journey entry from Flow 2: user can start a journey from the suggestion list, or continue an active one.

### Journey Interior
- First screen on opening an active journey: **status overview** — contextual summary of where things stand (e.g. "exposures in progress, resolutions not started").
- Four concerns inside a journey: exposures, resolutions, challenge, chat with vratmitra.

#### E/R/C Selection & Lifecycle
- Pool items (from global ERC dataset) are selected **once at journey start**. After selection, individual items can be **deactivated/paused** (not deleted) and **reactivated**. UI language: "pause" / "deactivate", not "delete".
- **Custom E/R/C** can be added by VA or VM at **any point** during the journey — not just at start. This is additive, not a re-selection.
- ⚠ Reconciliation: "one-time selection" applies to pool items only. Custom items are mid-journey additions. Both are valid simultaneously.

#### VM Suggestions & Sidenotes
- VM can **suggest** specific E/R/C items to the VA, either directly on the entity or via chat.
- Each suggested entity carries a **VM sidenote** (reasoning). The sidenote is **permanently visible** on that entity (not just at suggestion time). VA can acknowledge/dismiss it.
- Only **VA selects** (adds/activates) E/R/C. VM can only suggest — never directly add to the VA's active journey selections.

#### Experience Log
- VA can log experiences at any time within a journey.
- Each log entry can be attached to **one or many** E/R/C items — both active and inactive/deactivated ones.
- Logging = mark progress/completion + write a reflection/experience note. Both components present.

#### Custom E/R/C & Review Pipeline
- Either VA or VM can create a **custom E/R/C** entity within a journey.
- Each custom entity has two visibility options: **journey-scoped only** (default) or **submitted for review** to moderators/admin for inclusion in the global dataset.
- On moderator review: if approved → added to global dataset; if rejected → remains journey-scoped. VA and VM are notified of the outcome either way.
- If VA and VM independently submit equivalent custom items for review, the review side surfaces both for moderator awareness (no silent deduplication).

## Open Questions (area-specific)
- Full navigation structure of journey interior (how VA moves between status overview, E/R/C, challenge, chat)
- Challenge cardinality per journey (one vs. many) — still deferred from R2

## Flags
- ⚠ Algorithm enhancement — v1 suggestion logic must be architected for future swap without rewrite.
- ⚠ One-time pool selection vs. mid-journey custom addition reconciled above — ensure implementation treats these as two distinct addition paths.
