# Flows
_Last updated: 2026-05-31 | Round: R5_

## Confirmed Decisions

### Flow 1 — Study Your Weakness
- Entry: VA browses weaknesses → selects one → takes test (all sentences of linked subvirtues) → sees results.
- Results screen: flagged sentences (Sometimes/Never) surfaced at top; all sentences shown below.
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
- **Pool items** (from global ERC dataset): selected once at journey start. After selection, items can be **deactivated/paused** and **reactivated**. UI language: "pause/deactivate", not "delete".
- **Custom E/R/C**: addable by VA or VM at any point during the journey — not just at start.
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
- Each E/R/C entity has its own **status** (exact states TBD — examples: pending, in progress, completed, closed).
- VA submits an entity for completion/closure. **VM reviews and approves** the closure of any entity, including the entire journey.
- If no VM is attached: VA self-approves. VM is recommended, never required.
- VA cannot unilaterally mark their own entities complete when a VM is present — VM approval is the gate.

#### Mid-Journey VM Change
- VM can be changed mid-journey. This is explicitly allowed.
- Incoming VM gets full access to all prior work on the journey (all logs, statuses, sidenotes, chat history).
- Approvals made by the outgoing VM stand — incoming VM does not need to re-approve already-closed entities.
- ⚠ Edge case: entities submitted for closure but not yet approved when VM changes — incoming VM inherits the pending approval queue.

#### Custom E/R/C & Review Pipeline
- VA or VM can create custom E/R/C within a journey.
- Two visibility options: **journey-scoped** (default) or **submitted for review** to moderators/admin for global dataset inclusion.
- On review: approved → added to global dataset; rejected → remains journey-scoped. VA and VM notified either way.
- Duplicate submissions from VA and VM independently: flagged for moderator awareness. Exact deduplication mechanic TBD.

#### Journey Completion
- VA completes E/R/C items (VM approves closures, or self-approve if no VM).
- VM proposes challenge(s) via chat or directly. VA selects and works on them.
- Challenge completion: VA submits → VM approves (or self-approve if no VM).
- VM approval of journey completion is the final gate. No VM = VA self-approves journey closure.

### Chat
- One-on-one between VA and their journey VM. Not a group chat.
- Not visible to admin/moderator by default. TBD: sharing with admin for research/algorithm purposes (potentially anonymised).

## Open Questions (area-specific)
- Exact E/R/C status states (pending / in progress / completed / closed / other) — TBD
- Journey interior navigation structure (how VA moves between overview, E/R/C, challenge, chat)
- When/where is the VM philosophy note shown (onboarding vs. first VM interaction)?
- Chat sharing with admin for research: anonymised or not, opt-in or opt-out — TBD

## Flags
- ⚠ Algorithm enhancement — v1 suggestion logic must be architected for future swap without rewrite.
- ⚠ VM sidenote acknowledgement nullification on revocation — ensure no ghost state in DB.
- ⚠ Pending approval queue on mid-journey VM change — incoming VM must see and can action items in flight.
- ⚠ Duplicate custom ERC submissions — exact flagging mechanic deferred.
