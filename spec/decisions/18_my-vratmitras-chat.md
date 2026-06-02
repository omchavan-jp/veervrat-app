# My Vratmitras & Chat
_Last updated: 2026-06-02 | Round: R2_

## Confirmed Decisions

### My Vratmitras Page (`/my-vratmitras`)
- **Two-panel layout:** VM list on the left, VM detail on the right.
- **Left panel:** list of all VMs. Each entry shows: avatar, display name, online indicator, scope label (Global VM / Journey VM / both). Selecting a VM loads their detail on the right.
- **Right panel (VM detail):** full view of the selected VM:
  - Display name, avatar, online indicator, last active
  - Scope: Global VM badge (if applicable)
  - Journey VM for: list of journey names, each with an [Open] link to that journey
  - Actions: [View Profile], [Open Chat], [Global VM Settings] (if global VM), [Remove as VM]
- Chat is a deliberate action — not the default view. [Open Chat] button opens the persistent thread.
- Prominent link/CTA to the Guidance page always visible from this page.
- Notification settings: VA can toggle email notifications per VM (for chat) or globally for all chat — from settings or inline on this page.

### Chat
- **One persistent thread per VA-VM pair.** Not per journey — one thread covers everything.
- Chat is general purpose: journey-related discussion, approvals, suggestions, general conversation, icebreaking — all in the same thread.
- Real-time via WebSockets.
- Supports: text, images (stored via MinIO/Cloudflare CDN), link sharing with auto-rendered previews (OG metadata fetched server-side).
- **In-chat referencing:** VA or VM can reference any app entity inline using `@` or `#`. Referenced entity renders as a clickable card/chip in the message. Expandable to open the entity in-app.
  - Referenceable entities: journeys, exposures, resolutions, challenges, weaknesses, virtues, subvirtues, sentences, shlokas, blogs, experience log entries, Pothi sections.
  - Exact trigger syntax (`@` vs `#` per entity type) — TBD implementation detail.
- Chat history is persistent and fully visible to the incoming VM if VM changes mid-journey (already specced in lifecycle).
- Admin cannot view chat (v1).

### Guidance Page (`/guidance`)
- Separate top-level nav item. Aggregates all actionable items across all VMs and journeys — functions as an inbox.
- Clearly navigable from My Vratmitras page (link/button always visible).
- **VA view — items surfaced:**
  - ERC items submitted for approval (pending VM response)
  - VM suggestions for specific E/R/C items (with VM sidenotes)
  - Journey closure submissions pending VM approval
  - New ERC items available (due to weakness attachment)
  - VM messages flagged as actionable (TBD — implementation detail)
- **VM view (global VM only):** global VM can see the VA's guidance section — all pending items for the VA they are globally assigned to.
- VM also has their own guidance view showing their pending approvals to action — location TBD (VM Dashboard spec round).

### What Guidance Is Not Called
- Not "Guidance" if a better name emerges — the name is a placeholder. Alternatives: "Actions", "Pending", "My Queue". Final name TBD.

- **Chat mute:** VA can mute a chat thread with a specific VM — stops notifications, can still read/send. Reversible from settings.
- **Chat notifications:** in-app (bell) + email. VA can toggle email notifications per VM or globally for all chat — from settings or inline on the My Vratmitras page.
- **VM removal:** done from the VM detail panel (right panel) — [Remove as VM] action. For journey-level VM, removes from that journey. For global VM, goes to Global VM Settings for the migration flow.

## Open Questions (area-specific)
- Guidance page name — final copy TBD (alternatives: Actions, Pending, My Queue)
- VM guidance view location — covered in VM Dashboard spec round
- `@`/`#` trigger syntax per entity type — implementation detail TBD

## Flags
- ⚠ In-chat referencing spans the entire data model — implementation must use a generic entity reference system, not hardcoded per-type handlers.
- ⚠ Global VM sees VA's guidance section — permission check: `global_vm.view_va_guidance` must be scoped to VA-VM relationship, not role alone.
