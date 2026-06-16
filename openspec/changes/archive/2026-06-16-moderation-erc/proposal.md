## Why

VAs and VMs can create custom ERC items and submit them for review (Item 17), and the `CustomErcReview` record + `moderator.review_custom_erc` permission already exist — but there is no way for a moderator to actually review them. Item 28 builds the moderation review panel: a pending queue, a context-scoped review detail, and approve (with optional edits → promoted to the global pool) / reject (mandatory reason) actions, all audit-logged (reusing Item 27's `@Audited`) and notifying the submitter.

## What Changes

- **Backend — moderation module:** `GET /api/v1/moderation/custom-erc` (pending queue, paginated, FIFO), `GET /api/v1/moderation/custom-erc/:id` (review detail — ERC content + submitter profile + journey title + sentence + subvirtue/virtue + journey weakness tags; **never** journey contents/chat per spec/17), `POST /api/v1/moderation/custom-erc/:id/approve` (optional edits to the custom item, then promote a copy into the global pool — Exposure/Resolution/Challenge tied to the journey's sentence + weakness tags), `POST /api/v1/moderation/custom-erc/:id/reject` (mandatory reason — item stays journey-scoped). Admin+moderator only (`moderator.review_custom_erc`). Each action `@Audited` (`moderator.approve_custom_erc` / `moderator.reject_custom_erc` / `moderator.edit_custom_erc`) and fires `CUSTOM_ERC_APPROVED` / `CUSTOM_ERC_REJECTED` to the submitter.
- **Frontend — moderation panel:** `/moderation` dashboard (section cards w/ pending counts — Custom ERC + Reported Comments placeholder) and the Custom ERC Review panel (two-panel: queue left, review detail right — read-only context + editable ERC content + Approve/Reject). Moderator-only nav entry. The `(moderation)` route group is fixed to render inside the shared app shell (it is currently shell-less).

## Capabilities

### New Capabilities
- `moderation-custom-erc-api`: queue list + review detail + approve(+edits→pool promotion) + reject(reason); admin/moderator-only; audit-logged; submitter-notified; context strictly limited (no journey contents/chat).
- `moderation-ui`: moderation dashboard + Custom ERC Review two-panel panel (queue + context + editable content + approve/reject), moderator-only, four states, i18n, responsive, inside the app shell.

### Modified Capabilities
<!-- The custom-erc submission flow (Item 17) is unchanged. No spec-level requirement of an existing capability changes. -->

## Impact

- **New backend module:** `apps/api/src/modules/moderation/` (module, controller, service, repository, dto). Reads `CustomErcReview` + the journey ERC item + journey/sentence/subvirtue/virtue/weakness context; on approve, edits the custom item (reuse `ErcRepository.updateCustomItem`) and creates a pool entity + weakness tags; sets review status; notifies. Cross-module: uses `NotificationsService`; ERC reads/writes via `ErcRepository` (imported from the erc module's exports) or a focused moderation repository (design picks the cleaner).
- **Audit:** `@Audited` on approve/reject (Item 27 decorator). Honors the CLAUDE.md hard rule that all moderator actions are audit-logged.
- **Permissions:** `moderator.review_custom_erc` (exists, admin+moderator). No new rows.
- **Frontend:** `(moderation)` route group fixed to use the shared `AppLayoutClient` shell; `/moderation` dashboard + `/moderation/custom-erc` panel; moderator-only "Moderation" nav entry; `lib/api/moderation.ts` client + query keys. Reuse `BilingualText`, `EmptyState`.
- **Schema:** none (all models exist; verified `migrate status` clean). **No new dependencies.**
- **Deferred (recorded):** Reported-comments moderation panel, featured-content curation, shloka management/scheduling (spec/17 + spec/27 other moderation sections) — separate items (29/30). This item delivers the Custom ERC Review section + the dashboard shell.
