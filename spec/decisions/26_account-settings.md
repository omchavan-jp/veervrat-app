# Account Settings
_Last updated: 2026-06-18 | Round: R2 (Section 5 cascade rules pinned for implementation)_

## Confirmed Decisions

### Settings Structure
Accessible from the sidebar user chip → Settings. Sections:

#### 1. Profile
- Display name (editable)
- Username (editable — uniqueness enforced)
- Avatar (upload)
- Gender (optional, editable)
- Date of birth (optional, editable)
- Email (display only — change email requires verification flow)

#### 2. Privacy
- **Last active visibility:** toggle — show to everyone / show to followers only / hide entirely
- **Online indicator (currently active):** toggle on/off
- **Full profile privacy:** toggle — public / private (hidden from guests and non-followers)
- **Profile field visibility:** per-field toggles (journeys completed, tests taken, ERC counts, weaknesses worked on, experience entries) — all public by default

#### 3. Language
- UI language: EN / MR (Marathi) — radio select
- (Future: additional languages as added)

#### 4. Notifications
- Per-event-type email opt-out toggles (for events with email delivery)
- Chat email notifications: global toggle + per-VM overrides (links to My Vratmitras for per-VM setting)

#### 5. Vratmitra Settings
- Global VM: view current, change (triggers migration UI), remove
- UI walkthrough: "Restart tour" — re-triggers contextual walkthroughs per section

##### Global VM change/migration — cascade rules (pinned R2)
"Remove" already exists (`DELETE /vm-relationships/global` → `VmRelationshipsService.removeGlobalVm`, which ends the global relationship and returns the journey assignments that were held by that VM). "Change" is **remove-then-invite**, with an explicit choice about what happens to the journeys the outgoing global VM was assigned to. The cascade is driven by spec/04 ("Global VM self-withdrawal: VA is shown the same migration UI as VA-initiated global VM removal — choose what to do with existing journey assignments"; "pending approvals are left pending — not auto-approved, not auto-returned"; "incoming VM inherits the pending queue").

Concretely, when a VA changes/removes their global VM:
- The active **global** `VmRelationship` is ended (`endedAt` set). No new global relationship is created until the incoming VM **accepts** an invitation (a global VM invite is just a normal `PLATFORM`/global invitation — explicit acceptance required, per spec/04). I.e. "change" = remove + send a fresh global invite; there is no silent reassignment.
- For each **journey assignment** the outgoing VM held (`JourneyVmAssignment` where `vmId = outgoing`, active), the VA chooses per-cascade-decision (a single choice applied to all affected journeys, surfaced in the migration UI):
  - **`keep`** — leave the journey assignments untouched. The outgoing person stops being the *global* VM but remains the *journey* VM on those journeys. (Global and journey assignments are independent rows; removing global does not force-remove journey ones.)
  - **`unassign`** — end all of the outgoing VM's journey assignments too (`endedAt` set on each). Those journeys become VM-less; the VA self-approves until a new VM is assigned. **Pending approvals are left pending** (not auto-approved, not auto-returned) per spec/04.
- The incoming global VM, once they accept, does **not** auto-inherit journey assignments — journey assignment is a separate, explicit per-journey invite. ("Incoming VM inherits the pending queue" in spec/04 refers to the *journey-level* VM-change flow, where the new journey VM sees the same `submitted` items; it is not an automatic global→journey promotion.)
- Notifications: removal/self-withdrawal notifies the VA (`VM_WITHDREW`) — already implemented for journey withdrawal; global removal/change adds the same notification to the outgoing VM and (for VM self-withdrawal) the VA, reusing `VM_WITHDREW`.

##### Restart tour
- Onboarding/contextual walkthrough is a one-time gate (`User.onboardingCompletedAt` and a per-section seen-flag set). "Restart tour" clears the walkthrough seen-state so the contextual walkthroughs replay. v1: a single boolean reset (`tourCompletedAt`/equivalent flag → null) that the frontend reads to decide whether to show the contextual tour; it does **not** reset `onboardingCompletedAt` (the account-setup gate stays satisfied — the user is not sent back through signup onboarding).

#### 6. Account
- Change password (credential accounts only)
- Connected accounts (Google OAuth — connect/disconnect)
- Delete account (triggers anonymisation flow with confirmation prompt)

## Open Questions (area-specific)
- Two-factor authentication — not in v1 scope. Deferred.
- Session management (view active sessions, revoke) — not in v1 scope. Deferred.
