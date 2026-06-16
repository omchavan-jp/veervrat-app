## Context

Custom ERC submission (Item 17) creates a `CustomErcReview` (status pending) + sets the journey ERC item's `reviewStatus='pending'`. `moderator.review_custom_erc` (admin+moderator) and the audit `@Audited` decorator (Item 27) exist. The `(moderation)` route group exists but is shell-less (the same bug fixed for vratmitra in Item 21). Pool entities (Exposure/Resolution/Challenge) + their weakness-tag joins exist; journey ERC items carry the type-specific fields (tier / durationWeeks+frequency / durationDays). Schema is clean (verified).

## Goals / Non-Goals

**Goals:**
- Moderator queue (FIFO pending), review detail with strictly-limited context, approve(+edits→pool promotion), reject(mandatory reason).
- Audit every action (`@Audited`), notify the submitter (`CUSTOM_ERC_APPROVED`/`REJECTED`).
- Moderation dashboard shell + the Custom ERC panel, moderator-only, in the app shell.

**Non-Goals:**
- Reported-comments panel, featured-content curation, shloka management/scheduling — other moderation sections (later items); the dashboard shows their cards but only Custom ERC is wired here.
- Duplicate detection / side-by-side comparison (spec/27 "duplicate flag") — recorded as deferred; the queue ships without it.
- A "Save edits without deciding" draft action (spec/27) — approve carries the edits; a no-decision draft-save is deferred (recorded).
- Taxonomy creation — moderators never create virtues/subvirtues/weaknesses (spec/17 flag); approve only promotes an ERC item, reusing the journey's existing sentence + weakness tags.

## Decisions

### 1. New `moderation` module; ERC writes via the erc module's repository
A dedicated `moderation` module owns the review endpoints. It needs to read the journey ERC item + edit it + create a pool entity. Rather than duplicate ERC data access, the moderation module imports `ErcModule` and uses `ErcRepository` (already exported) for `findById`/`updateCustomItem`/`setReviewStatus`, plus a small `ModerationRepository` for the `CustomErcReview` queue/detail joins and the pool-promotion writes. **Rationale:** reuse Item 17's ERC data layer; keep moderation-specific queries (review joins, pool create) in the moderation repo. Cross-module via the repository the erc module exports (consistent with how other modules consume shared repos).

### 2. Context is strictly limited (spec/17)
The review-detail query returns ONLY: the ERC content (title/description/type-specific fields, current edits), submitter (display name + username + avatar), journey title, the journey's sentence (text), its subvirtue → virtue, and the journey's weakness tags. It MUST NOT return experience logs, ERC selections beyond this item, ERC status, or chat. **Rationale:** spec/17 "Moderator CANNOT see journey contents / chat." Enforced by the select shape (only the listed relations), not by post-filtering.

### 3. Approve = optional edit + promote to pool + mark approved
On approve: (a) if edits provided, apply them to the custom journey ERC item via `ErcRepository.updateCustomItem` (audited as `moderator.edit_custom_erc` when edits present); (b) create a pool entity (Exposure/Resolution/Challenge) from the (edited) item's fields, tied to the journey's `sentenceId`, copying type-specific fields + the journey's weakness tags into the pool entity's weakness-tag join; (c) set the `CustomErcReview` status=approved + reviewedBy/reviewedAt; set the journey item's `reviewStatus='approved'`; (d) notify submitter `CUSTOM_ERC_APPROVED`. All in a transaction for (b)+(c). **Rationale:** spec/27 "Approve adds to global pool with edits"; the promoted pool item is what makes the custom contribution reusable by others.

### 4. Reject = mandatory reason, stays journey-scoped
Reject requires a non-empty `reason` (DTO-validated). Sets `CustomErcReview` status=rejected + reviewNote=reason + reviewedBy/reviewedAt; sets the journey item's `reviewStatus='rejected'` (the item remains on the VA's journey, not promoted). Notifies submitter `CUSTOM_ERC_REJECTED` (reason in metadata). Audited `moderator.reject_custom_erc` with `{ reason }`. **Rationale:** spec/27 "Reject (mandatory reason, stays journey-scoped)".

### 5. Audit via @Audited on the controller
Approve/reject methods carry `@Audited` (resourceType `custom_erc`, resourceId = review id, metadata from body — reason / edits_made). The interceptor records after success (fire-and-forget). **Rationale:** Item 27 pattern; CLAUDE.md hard rule that all moderator actions are audit-logged.

### 6. `(moderation)` route group → shared app shell + moderator gate
Fix the shell-less `(moderation)/layout.tsx` to wrap children in `AppLayoutClient` (as done for `(vratmitra)` in Item 21). The moderation pages additionally redirect non-moderators (client-side guard) — server endpoints already enforce `moderator.review_custom_erc`. A "Moderation" nav entry shows only for moderators/admins. **Rationale:** Cautions §4 (correct structural group); spec/27 (moderator-only nav).

## Risks / Trade-offs

- **[Context leak]** → The review-detail select returns only the allowed relations; a test asserts no experience-log/chat/other-ERC fields are present. Enforced at the query, not by trusting the client.
- **[Pool promotion correctness]** → Pool entity create + review status update wrapped in a `$transaction`; type-specific fields mapped per ERC type; weakness tags copied from the journey. Covered by service tests per type.
- **[Double-approve / already-decided]** → Approve/reject reject a review whose status isn't `pending` (409-style). Idempotency guard tested.
- **[Moderator-only enforcement]** → Service checks `hasPermission(user, {type:'platform'}, 'moderator.review_custom_erc')`; controller under SessionGuard. Positive (mod/admin) + negative (VA) tests.
- **[Shell refactor regressions]** → `(moderation)` reuses the proven `AppLayoutClient`; verified by rendering `/moderation` with the rail present (same guard used for the chat/vratmitra fixes).

## Migration Plan

No DB migration. Verify `migrate status` clean (done). Ship backend (module + endpoints + pool promotion + audit + notify) → tests → frontend (shell fix + dashboard + panel + nav) → verify end-to-end with a real submitted custom ERC (mod approves → pool entity appears; mod rejects → reason + notification; VA blocked). Additive + reversible (pool entities can be deleted; review status is a field).
