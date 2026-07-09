# Tasks — In-Context Content Editor

Assumes decisions locked in `design.md` (reverse-lookup; R2 staging; GitHub-PR publish via
`fetch`; allowlist-backed `content.edit`; separate flag-gated deployment). **No new
dependencies; no Prisma migration.**

## 1. Permissions & config

- [ ] 1.1 Add `content.edit` to the permission type union and to `hasPermission()` —
      resolves true when `resource.type === 'platform'` and `user.id ∈` the configured
      editor allowlist; fail-closed on empty/unset allowlist
- [ ] 1.2 Add a `content.edit` row to `spec/decisions/05_permissions.md` (allowlisted
      content editors only; all other roles ❌)
- [ ] 1.3 Config: `CONTENT_EDITOR_USER_IDS` (comma-separated UUIDs) + a content-edit enable
      flag + GitHub publish settings (`GITHUB_TOKEN`, repo owner/name, base branch) — add to
      config schema/validation and `.env.example`; document that all default off/empty

## 2. API — `content-overrides` module (`apps/api/src/modules/content-overrides/`)

- [ ] 2.1 `content-overrides.repository.ts` — R2 get/put of `content-overrides/{en,mr}.json`
      via the existing `@aws-sdk/client-s3` (persistence boundary only; no Prisma)
- [ ] 2.2 `content-overrides.service.ts` — read merged overrides; upsert single key
      (authoritative ICU placeholder/plural validation against current value); publish
      (deep-merge over baked messages, sorted/formatted JSON, open GitHub PR on a new
      branch via REST `fetch`, never push to dev/main); `hasPermission('content.edit')`
      gate; custom exceptions from `common/exceptions/`
- [ ] 2.3 DTOs — `upsert-override.dto.ts` (key, locale enum, value with length bound);
      validation only, no identity fields trusted from the body
- [ ] 2.4 `content-overrides.controller.ts` — `GET /content-overrides`,
      `PUT /content-overrides` (upsert, `@Throttle`), `POST /content-overrides/publish`
      (`@Audited()` actor→PR ref, `@Throttle`); wire module into `app.module.ts`; import
      `AuthModule` for the session guard
- [ ] 2.5 Unit tests alongside — auth matrix (allowlisted upsert/publish ✅; authenticated
      non-allowlisted ⇒ 403; unauthenticated ⇒ 401; feature-disabled ⇒ no write); ICU
      mismatch ⇒ 422; publish opens a PR (GitHub REST mocked) and never targets dev/main

## 3. Web — i18n overlay merge (`apps/web/i18n/request.ts`)

- [ ] 3.1 Flag-gated branch: when `NEXT_PUBLIC_CONTENT_EDIT=on`, fetch staged overrides from
      the API and deep-merge over the baked messages (per-key nested set); short in-memory
      cache with write-invalidation; production path (flag off) unchanged
- [ ] 3.2 Update the `i18n` spec delta requirement (already drafted) and the middleware/
      request tests to cover the merge branch + the unchanged production branch

## 4. Web — in-context editor (`apps/web/components/shared/content-editor/`, flag-gated)

- [ ] 4.1 Isolated module dynamically imported only when `NEXT_PUBLIC_CONTENT_EDIT=on`, so
      it is excluded from the production bundle; nothing rendered/attached when off
- [ ] 4.2 Overlay: Option/Alt-click a text node → reverse-lookup its key from
      `useMessages()` value→key index; ambiguous/interpolated ⇒ open the searchable key
      panel (filter over all en/mr keys)
- [ ] 4.3 Edit panel: en + mr fields with live preview (writes through the override merge),
      missing-locale indicator, client-side ICU placeholder/plural guard blocking save on
      mismatch; save via the API client
- [ ] 4.4 Publish control → calls the publish endpoint, surfaces the returned PR URL
- [ ] 4.5 Mount `<ContentEditor />` behind the flag in the authenticated route-group
      layouts; editor-chrome strings added to `messages/en.json` + `mr.json` (no hardcoded
      text)
- [ ] 4.6 `lib/api/content-overrides.ts` + query keys — typed get/upsert/publish through
      `lib/api/client.ts`
- [ ] 4.7 Web unit tests — reverse-lookup (unique hit + ambiguous fallback), ICU client
      guard, flag gating (nothing mounts when off)

## 5. Deploy & verify

- [ ] 5.1 Stand up the separate content-edit Railway service (same project or new): web +
      API in content-edit mode, `NEXT_PUBLIC_CONTENT_EDIT=on`, allowlist + GitHub token set,
      network access restricted to the content editor; production services keep the flag off
- [ ] 5.2 End-to-end on the edit deployment: Option-click → edit en+mr → save → text updates
      live via merge → publish → PR opened updating both message files → review/squash-merge
      → production redeploys from merged JSON
- [ ] 5.3 Confirm production is unaffected: no editor UI, no override fetch, no new endpoints
      reachable on the testers' deployment

## 6. Docs & close the loop

- [ ] 6.1 DEPLOYMENT.md — new content-edit deployment + its env vars; note it is dev-only
- [ ] 6.2 CHANGELOG.md entry; pointer in `documentation/20_Solo-Dev-Operations.md`
- [ ] 6.3 `pnpm test` (api + web) + lint + typecheck green; then `/code-review` → fix →
      `/opsx:archive`; file/close the GitHub issue
