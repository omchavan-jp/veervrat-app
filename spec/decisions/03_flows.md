# Flows
_Last updated: 2026-05-31 | Round: R5_

## Confirmed Decisions

### Flow 1 — Study Your Weakness
- Entry: VA browses weaknesses → selects one → takes test (all sentences of linked subvirtues) → sees results.
- **"Why study weaknesses?" modal** accessible from entry — explains virtue-first philosophy and "sadgunachi upasana."
- Results screen: **primary** — suggested sentences to work on (flagged Sometimes/Never) surfaced at top; all sentences shown below. **Secondary** — cumulative view of virtues/subvirtues to work on, derived from the flagged sentences' subvirtue mappings.
- VA can start a journey from any sentence — no restriction based on score. Full freedom.

### Flow 2 — Work on Your Weakness (Dashboard)
- Single dashboard: ongoing journey stats + sentence suggestions.
- Suggestions v1: lowest-scored sentences across all weaknesses from latest test results.
- Algorithm enhancement: major future initiative, not v1. Must be built for swappability.
- VA can start a new journey or continue an active one from this dashboard.

### Journey Interior

#### Status Overview
- First screen on opening an active journey.
- Contextual summary: "what's going on" — e.g. exposures in progress, resolutions not started, challenge pending.
- Navigates into: exposures, resolutions, challenge, chat.

#### E/R/C Selection & Lifecycle
- **Pool items** (from global ERC dataset): selected at journey start. After selection, items can be **deactivated/paused** and **reactivated**. UI language: "pause/deactivate", not "delete".
- **Mid-journey pool addition:** when a new weakness is attached mid-journey, newly available pool ERC items (those tagged to the new weakness) become selectable. VA is notified and CAN select these items — it is a second selection event, not just informational.
- **Custom E/R/C**: addable by VA or VM at any point during the journey.
- **Multiple challenges per journey are allowed.**
- Both pool items and custom items can coexist in the same journey.

#### VM Suggestions & Sidenotes
- VM can suggest specific E/R/C items directly on the entity or via chat.
- Each suggestion carries a **VM sidenote** (VM's reasoning). VM can later **unsuggest** any entity and/or suggest different ones.
- When unssuggested: sidenote is removed. If VA had acknowledged a sidenote that is later revoked, the acknowledgement is nullified (not left as a ghost state).
- **Only VA selects/activates** E/R/C. VM can only suggest — never directly activate.

#### Experience Log
- VA logs experiences at any time within a journey.
- Each log entry: free-form reflection/experience note. Attachable to one or many E/R/C items (active or deactivated).
- Log ≠ completion. Logging and completion status tracking are separate concerns.

#### E/R/C Status Tracking
- Each E/R/C entity has its own status: `not_started → in_progress → submitted → approved` or `submitted → revisit`.
- `not_started → in_progress`: manual VA action — VA explicitly taps "Start" on an ERC item. Not automatic.
- `in_progress → submitted`: VA submits the item for closure/completion.
- `submitted → approved`: VM approves (or VA self-approves if no VM).
- `submitted → revisit`: VM returns for rework. VA revises and resubmits.
- VA cannot unilaterally approve when a VM is present — VM approval is the gate.
- If no VM: VA self-approves directly from `submitted`.

#### Journey Closure
- VA clicks "Submit for completion" on the journey Status Overview.
- Enabled once at least one challenge has been submitted or approved.
- VM notified to review and approve. If no VM: VA self-approves.

#### Loose Theme Tags
- Free-form text labels on shlokas, resources, and ERC items. No managed taxonomy — no pre-defined tag table. Stored as text array.
- Autocomplete shows previously used labels when typing — prevents fragmentation without enforcing taxonomy.
- Anyone with edit access to the entity can pick from existing labels or add new ones.

#### VM Suggestion Accept/Reject
- Accepting = VA activates that ERC item (same as self-selection). VM sidenote remains on the item.
- Rejecting = VA dismisses. VM sidenote removed. VM notified of rejection. ERC item remains in pool, can still be self-selected later.

#### Multiple Weakness Contexts at Journey Start
- Journey starts with only the weakness the VA navigated from (e.g. weakness A's test result).
- If the same sentence was flagged in weakness B's test (also taken by VA), the journey interior shows a contextual prompt: "This sentence was also flagged in your [Weakness B] test — want to attach that weakness to this journey?" Non-blocking, dismissible.

#### Mid-Journey VM Change
- VM can be changed mid-journey. This is explicitly allowed.
- Incoming VM gets full access to all prior work on the journey (all logs, statuses, sidenotes, chat history).
- Approvals made by the outgoing VM stand — incoming VM does not need to re-approve already-closed entities.
- ⚠ Edge case: entities submitted for closure but not yet approved when VM changes — incoming VM inherits the pending approval queue.

#### Custom E/R/C & Review Pipeline
- VA or VM can create custom E/R/C within a journey.
- Two visibility options: **journey-scoped** (default) or **submitted for review** to moderators/admin for global dataset inclusion.
- On review: approved → added to global dataset; rejected → remains journey-scoped. VA and VM notified either way.
- Duplicate submissions from VA and VM independently: flagged for moderator awareness (shown side-by-side with "possible duplicate" indicator). Exact automated deduplication detection deferred to future version.

#### Journey Completion
- VA completes E/R/C items (VM approves closures, or self-approve if no VM).
- VM proposes challenge(s) via chat or directly. VA selects and works on them.
- Challenge completion: VA submits → VM approves (or self-approve if no VM).
- VM approval of journey completion is the final gate. No VM = VA self-approves journey closure.

### Chat
- One-on-one between VA and their journey VM. Not a group chat.
- Not visible to admin or moderator. Admin chat access is not permitted in v1. Chat data sharing for research/algorithm purposes is deferred to a future version.

#### Journey Interior Navigation
- Tab/section structure: **Status Overview · Exposures · Resolutions · Challenges · Chat**.
- VA navigates freely between sections — no enforced linear sequence.
- Status Overview is read-only; reflects live state across all sections.

#### ERC Status States
- Lifecycle: `not_started → in_progress → submitted → approved` or `submitted → revisit`
- `revisit`: VM sends item back to VA for rework. Neutral — not failure. Ball returns to VA's court.
- VA submits; VM approves or returns to `revisit`. If no VM: VA self-approves.

#### Deactivated Pool Items
- When VA deactivates a pool-sourced ERC item: it stays visible in the journey view, greyed out.
- VA can then choose to **remove it completely** from the journey (permanent for that journey).
- Custom ERC items follow the same deactivate/remove pattern.

#### Challenge Suggestion Threshold
- Challenges are not gated — VA can select a challenge at any point.
- The system (and VM) **suggests** challenges only after a threshold is met.
- Default threshold (system-set): at least one exposure and one resolution marked complete/approved by VA.
- VM can **configure** the threshold for a specific journey (override the default).
- "Complete" means VA has marked it approved — not that calendar duration has elapsed.

## Open Questions (area-specific)
- When/where is the VM philosophy note shown (onboarding vs. first VM interaction)? — R5
- Chat sharing with admin for research: anonymised or not, opt-in or opt-out — R5
- Duplicate custom ERC submission flagging mechanic — R5

## Flags
- ⚠ Algorithm enhancement — v1 suggestion logic must be architected for future swap without rewrite.
- ⚠ VM sidenote acknowledgement nullification on revocation — ensure no ghost state in DB.
- ⚠ Pending approval queue on mid-journey VM change — incoming VM must see and can action items in flight.
- ⚠ Duplicate custom ERC submissions — exact flagging mechanic deferred.
