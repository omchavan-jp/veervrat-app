# VM Dashboard (Vratmitra View)
_Last updated: 2026-06-02 | Round: R1_

## Architecture

- **Fully integrated** — not a separate app or account switch. A user who is both VA and VM accesses both views from the same sidebar nav.
- Route group: `(vratmitra)/` — replaces the previous `(mentor)/` reference in AGENTS.md.
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

### 2. VM Guidance Page (`/vratmitra/guidance`) — VM-only, separate from VA guidance

Separate from the VA Guidance page (`/guidance`). Two distinct pages with distinct cognitive purposes:
- `/guidance` — "what do I need to do on my own journey?" (VA-facing)
- `/vratmitra/guidance` — "what does my mentee need from me?" (VM-facing)

**VM Guidance page items:**
- ERC closure requests submitted by VAs awaiting this VM's approval — grouped by VA
- Journey completion requests awaiting this VM's approval
- Custom ERC suggestions this VM made — status updates (accepted/rejected by VA)
- Sorted by: urgency (journey completion first), then by VA, then by submission date

**Navigation:** clearly navigable from My Vratarthis page (prominent link/CTA). Also a top-level nav item (visible only to users with active VM assignments).

**Nav badge:** each nav item shows its own count independently — `/guidance` shows VA pending count, `/vratmitra/guidance` shows VM pending count. No combined badge.

### 3. Chat (accessed from My Vratarthis)
- VM opens chat with a VA from the My Vratarthis right panel → [Open Chat].
- Opens the same persistent VA-VM thread (one thread per pair, as specced).
- No separate chat page for VM — same chat system, same thread, accessed from the VM's side.

---

## VM Public Profile
- **VM's own public profile** (as seen by others): displays "Guided X journeys to completion" stat. No other VM-specific fields beyond what is shown on any user's profile.
- VM credibility stat derived from: journeys where this user was the assigned VM at time of completion and the VA approved closure.
- **VM's profile privacy settings** follow the same rules as VA profiles (`decisions/10_public-profile.md`) — VM can toggle field visibility, make profile private, etc.
- The VM dashboard itself does not show the credibility stat — it's a public-facing profile field only.

---

## Nav Integration
- Sidebar nav shows VM nav items only when user has active VM assignments. Hidden entirely otherwise.
- VM nav items: **My Vratarthis** · **VM Guidance** (`/vratmitra/guidance`)
- VA nav item: **Guidance** (`/guidance`) — separate, always visible to all authenticated users
- Each nav item shows its own independent pending count badge. No combined count.
- Badge counts re-evaluated on VM assignment changes (acceptance, removal) via TanStack Query invalidation.

---

## Open Questions (area-specific)
- My Vratarthis list search/filter: **yes** — search by VA name/username when list grows large. Implementation detail.
- VM self-withdrawal: **yes** — VM can remove themselves. Confirmed in `decisions/04_lifecycle.md`.
- Notification for new pending approval: in-app + email (same as all other notifications) — assumed yes

## Flags
- ⚠ VM Guidance page must scope approval queue strictly to journeys this VM is assigned to. Permission check: `vm.approve_closure` scoped per assigned journey — not all VAs.
- ⚠ Nav VM items visibility must re-evaluate on VM assignment changes without page reload. Use TanStack Query invalidation on VM relationship events.
- ⚠ `/vratmitra/guidance` and `/guidance` are two separate pages with separate data fetches — do not merge into one route with conditional rendering.
