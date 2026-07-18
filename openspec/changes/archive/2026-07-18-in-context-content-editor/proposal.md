# In-Context Content Editor (dev-only)

Tracked as GitHub issue [#10](https://github.com/veer-vrat/veervrat-app/issues/10).
Process context: `documentation/20_Solo-Dev-Operations.md` (Loop 3 — Change lane).

## Why

The content expert is starting a copy-refinement pass over every user-facing string
(en/mr). Today that text lives only in `apps/web/messages/en.json` / `mr.json`, editable
solely by a developer through a code change and PR. That is a bottleneck: a non-technical,
Marathi-speaking editor cannot iterate on wording independently.

The need is a **hosted, independent, in-context** editing surface — the editor reaches a
URL on their own, sees the real app, clicks the actual text (Option/Alt-click on Mac),
and edits both languages side-by-side — while three invariants hold:

1. **The JSON files stay the single source of truth.** Edits round-trip back as a
   reviewed GitHub PR; production always rebuilds from the committed files.
2. **Production is untouched.** The editor, its overlay, and its endpoints are inert in
   the production build — no latency, no dependency, no exposure to real testers.
3. **The feature is quarantined and removable.** Flag-gated, isolated module, **zero new
   dependencies, no database migration** — deletable without residue if we drop it.

## What Changes

- **New content-edit mode** gated by `NEXT_PUBLIC_CONTENT_EDIT` (mirrors the existing
  `NEXT_PUBLIC_FEEDBACK_MODE` pattern). Unset/`off` in production; `on` only on a
  dedicated, access-restricted content-editing deployment.
- **In-context editor overlay** (web, isolated `components/shared/content-editor/`):
  Option/Alt-click any visible text → **reverse-lookup** its i18n key from the messages
  already in the next-intl provider → side panel to edit `en` + `mr` with live preview →
  save. No call-site tagging is introduced (reverse-lookup keeps every component
  untouched, and new copy becomes editable for free). Ambiguous or interpolated strings
  fall back to a searchable key panel.
- **Staged overrides stored server-side in R2** (existing bucket, new
  `content-overrides/` prefix) via a new API module — **no Prisma model, no migration.**
- **`i18n/request.ts` deep-merges staged overrides over the baked messages only when the
  mode flag is on.** With the flag off (production), message loading is byte-for-byte the
  current behaviour.
- **Publish action → GitHub PR.** A new API endpoint reads the baked messages + staged
  overrides and opens a PR updating `apps/web/messages/{en,mr}.json` via the GitHub REST
  API (plain `fetch`, **no Octokit dependency**). Normal review + squash-merge → deploy
  rebuilds from the merged files.
- **ICU-safety:** a save is rejected (client and server) if the edited value changes the
  set of `{placeholders}` / plural structure of the current value.
- **Access control:** writes are gated by a new `content.edit` permission (guard +
  `hasPermission`) and `@Audited()` on publish. See design decision D8 for the
  admin-vs-dedicated-role choice (the one open decision).

Out of scope (deliberately, v1): editing non-message content (blog/CMS bodies live in the
DB and have their own admin UIs), key rename/restructure (a code change), screenshots,
translation memory / machine translation, and multi-editor concurrency (a single editor
is assumed).

## Capabilities

### New Capabilities
- `content-editor`: the in-context editing UX — mode gating, Option-click reverse-lookup,
  the en/mr edit panel with live preview, client-side ICU-placeholder safety, and its
  production-inert behaviour.
- `content-overrides-api`: the API contract for staged overrides — R2-backed
  read/upsert, authoritative server-side ICU validation, permission enforcement, and the
  audited publish-to-GitHub-PR round-trip.

### Modified Capabilities
- `i18n`: `getRequestConfig` gains one flag-gated branch that deep-merges staged
  overrides over the baked messages in content-edit mode. Production behaviour is
  unchanged; the requirement text is updated so the spec stays truthful.

## Impact

- **Web**: new isolated `components/shared/content-editor/` module, mounted behind the
  flag in the authenticated layouts (as the feedback widget is); a single flag-gated
  branch in `i18n/request.ts`; new editor-chrome message keys (en/mr). **No new web
  dependency** (reverse-lookup uses `useMessages()`; API calls use the existing client).
- **API**: new `content-overrides` module (controller → service → repository over R2 via
  the already-approved `@aws-sdk/client-s3`; publish via GitHub REST `fetch`);
  `content.edit` permission row in `spec/decisions/05_permissions.md`; `@Audited()` on
  publish; throttled. **No new dependency.**
- **Storage**: R2 `content-overrides/en.json` + `mr.json` staging blobs. **No DB
  migration.**
- **Build/deploy**: new env — `NEXT_PUBLIC_CONTENT_EDIT` (web), a content-edit enable
  flag + a fine-grained GitHub token + target repo/branch config (api). A **separate
  Railway service** (same project or a new one) runs the edit deployment with the flag on
  and access restricted; production web/api services are unchanged.
- **Docs**: DEPLOYMENT.md (new deployment + vars), CHANGELOG.md, a pointer in
  `documentation/20_Solo-Dev-Operations.md`.
- **Removability**: delete the two modules, the `request.ts` branch, the env flags, the
  R2 prefix, and the permission row — no schema or dependency residue.
