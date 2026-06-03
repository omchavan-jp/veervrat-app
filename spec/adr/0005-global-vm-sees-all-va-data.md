# Global VM has full view of all VA data; journey-level VM is scoped to assigned journeys only

A global VM sees all of a VA's journeys, test results, and experience logs from the moment they accept the invitation. A journey-level-only VM sees only the journey(s) they are explicitly assigned to.

This creates two distinct scoping models within the same VM role. The initial spec assumed all VMs were scoped to assigned journeys only, which was incorrect — global VM is a fundamentally broader relationship, more akin to a full mentor than a per-journey guide.

## Considered Options
- **All VMs scoped to assigned journeys only** — rejected: doesn't match the intent of a global VM relationship, which is holistic mentoring across all of a VA's work.
- **All VMs see all VA data** — rejected: journey-level VMs are invited for a specific purpose and should not have access beyond that scope.
- **Two-tier scoping (global = full, journey = scoped)** — chosen: matches the semantic difference between the two VM relationship types.
