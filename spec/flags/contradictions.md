# Contradictions & Flags
_Last updated: 2026-05-31_

## Active
- ⚠ **"No hierarchy display" vs. "verification mechanism"** — User Roles R1 — unresolved. Stat-based credibility must be surfaced without creating perceived tiers. Deferred.
- ⚠ **Algorithm enhancement** — Flows R3 — v1 suggestion logic must be architected for future swap without rewrite.
- ⚠ **VM sidenote acknowledgement nullification** — Flows R5 — ensure no ghost state in DB when VM revokes a sidenote the VA already acknowledged.
- ⚠ **Pending approval queue on mid-journey VM change** — Flows R5 — incoming VM must inherit and can action entities submitted-but-not-yet-approved by outgoing VM.
- ⚠ **Duplicate custom ERC submissions** — Flows R5 — flagging mechanic for moderator awareness deferred.
- ⚠ **Dormant state requires background scheduler** — Lifecycle R1 — carry to tech constraints.
- ⚠ **ABAC requires full resource objects in permission checks** — Permissions R1 — backend must pass full resource objects, not IDs, into hasPermission. Must be enforced as a convention in service layer.
- ⚠ **Journey ERC union filter on weakness attachment** — Lifecycle R1 — ERC shown = intersection of sentence ERC weakness tags and journey's attached weaknesses. Must re-evaluate dynamically when weakness added mid-journey, not a snapshot at start.

## Resolved
- ⚠ **One-time E/R/C selection vs. mid-journey custom addition** — Flows R4 — resolved. Pool items selected once at start (deactivatable/reactivatable). Custom E/R/C addable at any point. Two distinct paths.
- ⚠ **VM required for completion** — Flows R5 — resolved. VM never required. VA self-approves all closures if no VM. VM recommended only.
- ⚠ **One vs. many challenges per journey** — Flows R5 — resolved. Multiple allowed.
