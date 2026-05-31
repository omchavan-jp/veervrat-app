# Edge Cases & Invariants
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions

### Journey Invariants
- A VA can never have two non-completed journeys for the same sentence simultaneously. Attempting to start a second one surfaces the existing journey with an option to attach a new weakness context.
- A completed journey is permanently read-only. No state can revert it.

### ERC State Invariants
- ERC status can never move backwards autonomously. The only permitted backward move is VM explicitly sending a `submitted` item to `revisit`.
- `approved` is a terminal state for an ERC item — it cannot be reopened or returned to `revisit`.

### Scoping Invariants
- A journey-level-only VM (not global VM) can never access any data outside their assigned journeys, regardless of how long they have been a VM or how many journeys they are on.
- Global VM sees all VA data from the moment they accept the invitation. There is no partial or delayed access.

### Account Deletion
- If a VA deletes their account: all personal data is **anonymised**, not permanently deleted. Journey data, ERC logs, test results are retained in anonymised form for platform integrity and research purposes.
- If a VM deletes their account: their assignments are removed. Journeys they were assigned to are left without a VM (VA continues solo or invites a new one). Their sidenotes and chat history are anonymised.

### Custom ERC Ownership
- Once a custom ERC item is approved into the global pool by a moderator, it becomes **platform-owned**. The original creator (VA or VM) cannot edit or delete it from the global pool.
- It remains visible in the journey it was created in, in its original form, as journey-scoped copy.

### Data Integrity
- An ERC item cannot be deleted from the global pool if it is actively selected in any live journey. Must be deactivated/deprecated first.
- A weakness cannot be detached from a journey if it is the only weakness and there are active ERC items filtered by that weakness — removing it would orphan those items.

## Open Questions (area-specific)
- What does "anonymised" mean exactly for account deletion — pseudonymous ID, or full content scrub? Detail TBD with legal/privacy requirements.
- What happens to pending VM invitations when the inviting VA deletes their account?
- What happens to an in-progress custom ERC review if the submitter deletes their account before the moderator decides?

## Flags
- ⚠ `approved` as terminal ERC state — ensure no accidental rollback path exists in the service layer.
- ⚠ Global pool ERC deletion guard — must check active journey usage before allowing deprecation.
