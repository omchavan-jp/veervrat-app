# VM Dashboard (Vratmitra View)
_Last updated: 2026-06-02 | Round: R1_

## Architecture

- **Fully integrated** — not a separate app or account switch. A user who is both VA and VM accesses both views from the same sidebar nav.
- Route group: `(vratmitra)/` — replaces the previous `(mentor)/` reference in CLAUDE.md.
- Nav items for VM sections are only visible to users who currently hold an active VM assignment (global or journey-level). Hidden entirely for users with no VM assignments.

---

## Pages

### 1. My Vratarthis (`/my-vratarthis`)
Mirror of My Vratmitras, from the VM's perspective.

**Two-panel layout** (same pattern as My Vratmitras):
- **Left panel:** list of all VAs the VM is mentoring.
  - Each entry: VA avatar, display name, online indicator, scope label (Global VM / Journey VM for N journeys).
  - Global VM assignments shown with a distinct indicator.
- **Right panel (VA detail):** on selecting a VA:
  - Display name, avatar, online indicator, last active
  - Scope: Global VM badge (if applicable)
  - Journeys this VM is assigned to for this VA — each with state indicator (active/paused/dormant) and [Open Journey] link
  - Actions: [View Profile], [Open Chat], [Remove myself as VM] (for journey-level; global VM removal goes through settings)
  - Link to this VA's relevant Guidance items (pending approvals for this VA)

### 2. Guidance Page (`/guidance`) — role-aware, shared with VA
Single unified page that shows actionable items for whoever is viewing, based on their roles.

**When viewed by a user who is a VM:**
- **VM section (shown first if there are pending items):**
  - ERC closure requests submitted by VAs awaiting this VM's approval
  - Journey completion requests awaiting this VM's approval
  - Custom ERC suggestions they made that have been actioned (accepted/rejected by VA) — status update
- **VA section (shown below):**
  - Their own pending items as a VA (ERC submitted for approval, new ERC available, etc.)

If the user is only a VM (no VA journeys of their own), only the VM section is shown. If only a VA, only the VA section. Both if both.

**Navigation:** clearly navigable from My Vratarthis page (prominent link/CTA).

### 3. Chat (accessed from My Vratarthis)
- VM opens chat with a VA from the My Vratarthis right panel → [Open Chat].
- Opens the same persistent VA-VM thread (one thread per pair, as specced).
- No separate chat page for VM — same chat system, same thread, accessed from the VM's side.

---

## VM Credibility Stat
- "Guided X journeys to completion" — shown on the VM's public profile.
- Derived from: journeys where this user was the assigned VM at the time of journey completion and the VA approved/self-approved the closure.
- Not shown in the VM dashboard itself — it's a public profile stat.

---

## Nav Integration
- Sidebar nav shows VM sections only when user has active VM assignments.
- VM nav items: **My Vratarthis** · **Guidance** (shared, role-aware).
- Same Guidance nav item serves both VA and VM — badge count reflects total pending items across both roles.

---

## Open Questions (area-specific)
- When a VM is on 50+ journeys across many VAs — does the My Vratarthis list need search/filter? (Assumed yes for scale — TBD implementation detail)
- Can a VM step down from a journey-level assignment themselves, or only be removed by the VA? (Assumed VM can also withdraw — TBD)
- Notification for new pending approval: in-app + email (same as all other notifications) — assumed yes

## Flags
- ⚠ Guidance page is role-aware — must correctly scope VM approval queue to only the journeys this VM is assigned to. Permission check: `vm.approve_closure` scoped to assigned journey only.
- ⚠ Nav VM items visibility — must re-evaluate on VM assignment changes (acceptance, removal) without requiring page reload. Use TanStack Query invalidation on VM relationship events.
