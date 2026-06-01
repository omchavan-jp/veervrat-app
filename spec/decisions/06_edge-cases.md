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

- **Anonymisation (account deletion):** pseudonymous ID — personal identifiers (name, email, avatar) replaced with a pseudonymous token. Content (journey data, logs, ERC) retained under that token. Exact legal/privacy detail TBD when privacy policy is written.
- **Pending VM invitations when VA deletes account:** all pending invitations auto-cancelled. Invitees notified that the invitation is no longer valid.
- **In-progress custom ERC review when submitter deletes account:** review continues. Submission is anonymised (shown as "[Deleted user]" to moderator) but content remains for moderator to decide. Decision stands regardless of submitter's account status.

## Open Questions (area-specific)
_(none — area closed)_

## Flags
- ⚠ `approved` as terminal ERC state — ensure no accidental rollback path exists in the service layer.
- ⚠ Global pool ERC deletion guard — must check active journey usage before allowing deprecation.
