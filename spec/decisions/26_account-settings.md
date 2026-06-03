# Account Settings
_Last updated: 2026-06-02 | Round: R1_

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

#### 6. Account
- Change password (credential accounts only)
- Connected accounts (Google OAuth — connect/disconnect)
- Delete account (triggers anonymisation flow with confirmation prompt)

## Open Questions (area-specific)
- Two-factor authentication — not in v1 scope. Deferred.
- Session management (view active sessions, revoke) — not in v1 scope. Deferred.
