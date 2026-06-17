# Design

## Cascade semantics (spec/26 R2, spec/04)
Global and journey VM assignments are independent rows (`VmRelationship` vs
`JourneyVmAssignment`). Ending the global relationship does not force-end journey ones, so
the VA gets an explicit choice surfaced in the migration UI:

- **`keep`** (default): only the global `VmRelationship` is ended. The outgoing person stops
  being the global VM but remains the journey VM wherever they were separately assigned.
- **`unassign`**: additionally end every active `JourneyVmAssignment` the outgoing VM holds
  on this VA's journeys. Those journeys become VM-less (VA self-approves until a new VM is
  assigned). **Pending approvals (`submitted` items) are left as-is** — not auto-approved,
  not auto-returned (spec/04).

`removeGlobalVm` returns the affected journeys (already does) plus what was done, so the UI
can confirm. The cascade choice is a request body `{ cascade: 'keep' | 'unassign' }`;
omitting it defaults to `keep` (backwards-compatible with the current no-body DELETE).

## "Change" is remove + invite, not a new endpoint
Per spec/04, the incoming global VM must explicitly accept. So "change" in the UI is a
two-step: call `removeGlobalVm` (with cascade), then use the existing invitations flow
(`POST /invitations` with `type: VM_GLOBAL`) to invite the replacement. No silent
reassignment and no new backend endpoint for the invite half — this keeps a single
invitation/acceptance code path.

## Notifications
- On removal/change: notify the **outgoing VM** with `VM_WITHDREW` (reusing the existing
  event; resourceType `user`). This now also sends an email via the Item 36 centralized path
  (VM_WITHDREW is an emailable event). Journey-level `unassign` does not emit a separate
  per-journey notification — the single global-removal notification covers it (the outgoing
  VM already knows which VA removed them).
- VM self-withdrawal from the *global* role (spec/04: "VA is notified") is out of scope here
  — there is currently no global-VM self-withdraw endpoint (only journey-level
  `withdrawJourneyVm` exists). Recorded as a follow-up; this change covers the VA-initiated
  change/remove path that Section 5 needs.

## Restart tour
There is no contextual-tour component yet (only the one-time onboarding gate). spec/26 R2
scopes Restart tour to clearing a reset flag the future tour will read. Implement as
`User.tourResetAt` (timestamp, nullable) set by `POST /users/me/restart-tour`. It does NOT
reset `onboardingCompletedAt`. Returned on `GET /users/me` so the frontend can later decide
whether to replay walkthroughs. v1 UI: the button calls the endpoint and confirms "Tour will
restart" — the actual contextual walkthroughs are a future build (the flag is the seam).

## Permissions
- `removeGlobalVm` / restart-tour: the caller acts on their own account — `isVa(user)` for
  VM removal (already enforced); restart-tour is any authenticated user.
- No ABAC resource needed beyond ownership (operating on `user.id`).

## Testing
- Service: `keep` ends only global; `unassign` ends global + journey assignments; pending
  approvals untouched; outgoing VM notified; non-VA rejected; no active global VM → 404.
- Restart tour: sets `tourResetAt`, leaves `onboardingCompletedAt` intact.
- Auth matrix: unauthenticated → 401; VM-only (non-VA) removal → 403.
