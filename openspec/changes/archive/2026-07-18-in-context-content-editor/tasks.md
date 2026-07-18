# Tasks — In-Context Content Editor

Assumes decisions locked in `design.md` (reverse-lookup; R2 staging; GitHub-PR publish via
`fetch`; allowlist-backed `content.edit`; separate flag-gated deployment). **No new
dependencies; no Prisma migration.**

Status: code complete and verified locally (666 api + 131 web tests green, typecheck + lint
clean). Remaining: the content-edit deployment (§5, requires Railway + a GitHub PAT),
`/code-review`, and `/opsx:archive`.

## 1. Permissions & config

- [x] 1.1 Add `content.edit` to the permission union + `hasPermission()` — true when
      `resource.type === 'platform'` and the service-computed `isContentEditor` is set;
      fail-closed; not granted by any role
- [x] 1.2 Add a `content.edit` note to `spec/decisions/05_permissions.md` (allowlist-gated)
- [x] 1.3 Config: `CONTENT_EDIT_ENABLED`, `CONTENT_EDITOR_USER_IDS`, and GitHub publish
      settings in the Joi schema + `.env.example` (all default off/empty)

## 2. API — `content-overrides` module (`apps/api/src/modules/content-overrides/`)

- [x] 2.1 `content-overrides.repository.ts` — R2 get/put of `content-overrides/{en,mr}.json`
      via the existing `@aws-sdk/client-s3` (no Prisma)
- [x] 2.2 `content-overrides.service.ts` — read/upsert (authoritative ICU parity), publish
      (merge over baked git files, open a GitHub PR on a new branch, never push to dev/main),
      `hasPermission('content.edit')` gate, feature gate
- [x] 2.3 `upsert-override.dto.ts` — validated key/locale/value/baseValue
- [x] 2.4 `content-overrides.controller.ts` — GET (feature-gated), PATCH upsert (`@Throttle`),
      POST publish (`@Audited`, `@Throttle`); wired into `app.module.ts` (imports AuthModule)
- [x] 2.5 Unit tests — auth matrix (allowlisted ✅; non-allowlisted ⇒ 403; admin-not-listed ⇒
      403; unauthenticated ⇒ 401; disabled ⇒ 404); ICU mismatch ⇒ 422; publish opens a PR
      (GitHub mocked) and never targets dev/main

## 3. Web — i18n overlay merge (`apps/web/i18n/request.ts`)

- [x] 3.1 Flag-gated branch: when `NEXT_PUBLIC_CONTENT_EDIT=on`, fetch staged overrides and
      deep-merge over the baked messages (non-mutating clone); production path unchanged
- [x] 3.2 `i18n` spec delta updated; the pure merge/reverse-lookup/ICU utils are unit-tested

## 4. Web — in-context editor (`apps/web/components/shared/content-editor/`, flag-gated)

- [x] 4.1 Dynamically imported only when `NEXT_PUBLIC_CONTENT_EDIT=on` (excluded from the
      production bundle)
- [x] 4.2 Overlay: ⌥/Alt-click → reverse-lookup the key from `useMessages()`; ambiguous ⇒
      key picker
- [x] 4.3 Edit panel: en + mr fields, live preview via `router.refresh`, missing-locale
      indicator, client-side ICU guard blocking save on mismatch
- [x] 4.4 Publish control → publish endpoint, surfaces the PR URL
- [x] 4.5 Mounted behind the flag in the authenticated shell; editor-chrome strings added to
      `messages/en.json` + `mr.json` (bilingual, no hardcoded text)
- [x] 4.6 `lib/api/content-overrides.ts` browser client (PATCH upsert, POST publish)
- [x] 4.7 Web unit tests for the pure logic (reverse-lookup unique + ambiguous, ICU guard,
      deep-merge). Interactive overlay behaviour is verified on the deployment (§5.2)

## 5. Deploy & verify

Approach evolved during rollout: instead of a separate access-restricted deployment, the
editor was **allowlist-gated per user** (PR #12) so it is safe to enable directly on the
existing production services. Follow-ups shipped beyond the original scope: attribution
(who/when) + audit + staged-edits list (#15), edit panel reflects staged value (#16),
discard staged edits (#17), and a web Docker build-arg fix (#13).

- [x] 5.1 Enabled on the existing Railway web+api services with `NEXT_PUBLIC_CONTENT_EDIT=on`,
      `CONTENT_EDIT_ENABLED=true`, the editor allowlist, and a GitHub PAT — gated per user
      rather than by a separate deployment (see DEPLOYMENT.md §9 + allowlist gating)
- [x] 5.2 End-to-end verified live: ⌥-click → edit → save → live merge → publish → PR
      (the test PR #14 was the proof, since closed)
- [x] 5.3 Production confirmed unaffected for non-editors: pill not mounted, no override
      fetch, `/content-overrides` returns 401/404 without an allowlisted editor session

## 6. Docs & close the loop

- [x] 6.1 DEPLOYMENT.md §9 (content-edit deployment + env vars); `.env.example` (api + web)
- [x] 6.2 No CHANGELOG entry — the editor is dev-only, not user-visible (CHANGELOG is
      user-facing); tracked via issue #10 + this change
- [x] 6.3 Verified (typecheck/lint/667 api + 131 web tests green; CI lint greened in #18),
      archived, and issue #10 closed
