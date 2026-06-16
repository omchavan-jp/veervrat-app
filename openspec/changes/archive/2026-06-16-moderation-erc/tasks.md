## 1. Preflight

- [x] 1.1 Verify `prisma migrate status` clean (drift guard) — DONE: clean; no schema changes

## 2. Backend — moderation module

- [x] 2.1 Scaffold `apps/api/src/modules/moderation/` (module, controller, service, repository, dto) + register in app.module; import ErcModule + NotificationsModule
- [x] 2.2 ModerationRepository: `listPending` (CustomErcReview pending, FIFO, cursor + ERC title/type/submitter), `findReviewDetail` (review + journey ERC item content + submitter + journey title + sentence + subvirtue/virtue + journey weakness tags — NO journey contents/chat), `promoteToPool` (create Exposure/Resolution/Challenge from item + sentence + weakness tags, in tx), `setReviewDecision` (status/reviewedBy/reviewedAt/reviewNote)
- [x] 2.3 Service: getQueue / getDetail (mod-only via hasPermission moderator.review_custom_erc); approve (optional edits via ErcRepository.updateCustomItem, promote, set review approved + item reviewStatus, notify CUSTOM_ERC_APPROVED; reject non-pending); reject (mandatory reason, set rejected + item reviewStatus, notify CUSTOM_ERC_REJECTED)
- [x] 2.4 DTOs: approve (optional edit fields), reject (required reason)
- [x] 2.5 Controller: GET queue + GET :id (SessionGuard), POST :id/approve + :id/reject (SessionGuard + @Audited moderator.approve_custom_erc/reject_custom_erc/edit_custom_erc)

## 3. Backend — tests

- [x] 3.1 Service spec: queue + detail (mod-only, VA 403); detail excludes journey contents/chat; approve promotes pool per type + notifies + sets statuses; approve non-pending rejected; reject requires reason + notifies + not promoted; edit-then-approve

## 4. Frontend

- [x] 4.1 Fix `(moderation)/layout.tsx` → reuse AppLayoutClient shell; moderator client-guard
- [x] 4.2 `lib/api/moderation.ts` (getQueue/getDetail/approve/reject) + query keys
- [x] 4.3 `/moderation` dashboard (section cards + Custom ERC pending count)
- [x] 4.4 `/moderation/custom-erc` two-panel review panel (queue + context read-only + editable content + Approve/Reject; four states; BilingualText)
- [x] 4.5 Moderator-only "Moderation" nav entry (driven by user roles); i18n en+mr at parity

## 5. Verification

- [x] 5.1 API + web typecheck clean; both production builds pass
- [x] 5.2 Full API suite green; web tests green
- [x] 5.3 Backend probe (real submitted custom ERC): VA submits → mod queue shows it; detail (no journey contents); approve → pool entity created + CUSTOM_ERC_APPROVED notif + audit event; reject → reason + CUSTOM_ERC_REJECTED + not promoted; VA→endpoints 403
- [x] 5.4 Rendered-UI: moderation dashboard + panel (queue→detail→approve/reject), moderator-only nav, shell present, four states, mobile+desktop, console clean
- [x] 5.5 Record deferrals (reported-comments panel, featured curation, shloka mgmt = later; duplicate detection; save-edits-without-deciding)


## Notes

- **Verified end-to-end (real submitted custom ERC, mod via temp role):** queue shows it; detail context strictly limited (journey keys: id/title/sentence/weaknesses — no logs/chat/status); approve+edit → pool Exposure created with edited title + journey weakness tag, review+item=approved, CUSTOM_ERC_APPROVED notif, moderator.approve_custom_erc audit; reject(reason) → rejected+note, item=rejected, NOT promoted, CUSTOM_ERC_REJECTED notif, moderator.reject_custom_erc audit; VA→endpoints 403; no-reason→422. Browser: moderator nav appears, dashboard pending count, panel queue→detail→approve clears queue, shell present, no console errors.
- **Reused (per lessons):** @Audited (Item 27), ErcRepository (Item 17, now exported), NotificationsService, (moderation) shell fixed like (vratmitra) in Item 21 (shell-less bug class). CustomErcReview has no User relation → submitters fetched separately by id. No schema changes, no new deps.
- **Deferred (recorded):** reported-comments moderation panel, featured-content curation, shloka management/scheduling (other spec/17 sections = later items); duplicate detection/side-by-side; save-edits-without-deciding draft action.
