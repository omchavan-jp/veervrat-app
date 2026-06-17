# Global VM change/migration + Restart tour

## Why
Account Settings Section 5 (Vratmitra settings, spec/26 §5) was deferred at Item 32
(Deferral Ledger #31). The backend has `removeGlobalVm` but it neither cascades to the
outgoing VM's journey assignments nor notifies anyone, and there is no settings UI for
viewing/changing/removing the global VM or for "Restart tour". spec/26 R2 now pins the
cascade rules, so this change implements them.

## What changes
- **Global VM removal becomes a cascade-aware operation.** `removeGlobalVm` accepts a
  cascade choice — `keep` (leave the outgoing VM's journey assignments intact) or
  `unassign` (end all of the outgoing VM's journey assignments too). Pending approvals are
  left pending in both cases (spec/04). The outgoing VM is notified (`VM_WITHDREW`).
- **Global VM "change"** = remove (with cascade choice) + send a fresh global VM invitation
  to the new person. There is no silent reassignment — the incoming VM must accept (the
  existing invitation flow already enforces this). No new endpoint is needed for the invite
  half; the migration UI reuses the existing invitations flow after removal.
- **Restart tour.** A new `tourResetAt` reset: `POST /users/me/restart-tour` clears the
  contextual-walkthrough seen-state (a single timestamp the future contextual tour reads)
  WITHOUT touching `onboardingCompletedAt` (the account-setup gate stays satisfied).
- **Settings Section 5 UI** — view current global VM, Change (migration UI with cascade
  choice), Remove (with cascade choice), and Restart tour.

## Impact
- Affected specs: `vm-relationship-management` (new delta), `account-settings` (Restart tour
  + Section 5 UI delta).
- Affected code: `vm-relationships` module (service/controller/repository/dto + tests),
  `users` module (restart-tour endpoint), settings page (Section 5), schema (`User.tourResetAt`).
- No breaking API changes — `removeGlobalVm` gains an optional cascade body (defaults to
  `keep`, preserving current behaviour).
