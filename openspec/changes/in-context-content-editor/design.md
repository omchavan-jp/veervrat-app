# Design — In-Context Content Editor

## Context

next-intl renders `t('feedback.buttonLabel')` into plain text; the DOM does not carry the
key. Messages are nested JSON loaded per-request in `apps/web/i18n/request.ts` (dynamic
`import('../messages/${locale}.json')`) and provided to the client tree via
`NextIntlClientProvider`. In a deployed build these messages are **baked in at build
time**, so "edit it live and have it reach git" requires (a) a runtime staging layer the
edit deployment reads and (b) a round-trip back to the JSON files. Everything below serves
the three invariants in the proposal: JSON stays source of truth, production untouched,
feature removable.

## Decisions

### D1 — Map rendered text → key by reverse-lookup, not call-site tagging
On Option/Alt-click, read the clicked text node's `textContent` and look it up against a
value→dotted-key index built once from `useMessages()`. **Chosen over** wrapping every
`t()` call site in a `<T data-i18n-key>` component.
- **Why:** zero footprint in feature code (no component churn across hundreds of files),
  so the feature stays isolated and removable, and any copy added later is editable with
  no extra wiring.
- **Trade-off:** interpolated strings (placeholders already substituted) and duplicate
  strings won't uniquely match. Those fall back to a **searchable key panel** (filter the
  full en/mr list, pick the key). The overlay always offers the panel as an escape hatch.

### D2 — Baked JSON is truth; overrides are a staging layer merged only in edit mode
`i18n/request.ts` loads the baked `messages/{locale}.json` exactly as today, then — **only
when `NEXT_PUBLIC_CONTENT_EDIT` is on** — fetches the current staged overrides for the
locale and deep-merges them over the baked object. Production never takes this branch.
Publish reconciles the staging layer back into the files (D4), after which overrides for
those keys are redundant and cleared.

### D3 — Store overrides as R2 blobs, not a Postgres table
Staged overrides live as `content-overrides/en.json` and `content-overrides/mr.json` in
the existing R2 bucket, read/written with the already-approved `@aws-sdk/client-s3`
(same client `uploads.service.ts` uses).
- **Why over a Prisma model:** a migration adds a permanent table to the schema that is
  awkward to remove (the user's explicit no-bloat / removability concern); a blob touches
  no schema. The blob is also the *same shape as the artifact we publish*, so publish is a
  trivial read-merge-PR. Durable and cheap; reuses infra we already run.
- **Trade-off:** whole-blob read-modify-write on each upsert. Fine for a single editor.
  The edit deployment caches the merged overrides in memory with write-invalidation so
  `getRequestConfig` doesn't hit R2 on every render.

### D4 — Publish via GitHub REST `fetch`, not Octokit, not manual export
Publish reads baked messages + staged overrides, deep-merges, and opens a **PR** against a
fresh `content/edits-<timestamp>` branch updating both message files, using the GitHub
REST API over plain `fetch` (create ref → put file contents → open PR; ~4 calls).
- **Why:** keeps JSON the source of truth and routes edits through your normal review +
  squash-merge; **no new dependency** (avoids Octokit) — directly serving the removability
  invariant. A fine-grained PAT scoped to *contents + pull-requests* on the one repo is
  held as an API-side env secret; never writes to `dev`/`main` directly.
- **Rejected:** "export/download JSON for the maintainer to commit" (manual, error-prone).

### D5 — ICU-placeholder safety, enforced both sides
Parse the placeholder / plural-`select` token set from the *current* value; reject a save
whose edited value has a different token set. Client-side for instant feedback; server-side
as the authority (frontend is never a security boundary). Prevents `"Hello {name}"` →
`"Hello name"` silently breaking interpolation.

### D6 — Isolation & removability (the user's core concern)
- Single env flag `NEXT_PUBLIC_CONTENT_EDIT` (web) + a content-edit enable flag (api) gate
  everything; both default off.
- All editor UI lives in one folder `components/shared/content-editor/`; all API logic in
  one module `modules/content-overrides/`; the only edit to shared code is one flag-gated
  branch in `i18n/request.ts`.
- Endpoints reject when the flag is off or `NODE_ENV==='production'` without the edit flag
  — the write path cannot exist on the real production service.
- **No new dependency, no migration.** Removal = delete the folder + module + the
  `request.ts` branch + flags + R2 prefix + permission row.

### D7 — Topology: a separate, access-restricted deployment
A dedicated Railway service (same project or a new one — user is fine either way) runs the
web (+ its API access) with the flag on and network access restricted to the content
expert. Production services never set the flag. Defense-in-depth: deployment-level access
restriction **and** the server-side `content.edit` permission on every write. "Same URL as
production" is intentionally *not* used — enabling live overlay + write endpoints on the
testers' deployment would add latency and risk.

### D8 — Access identity: allowlist-backed `content.edit` permission (DECIDED)
Writes are authorized by `hasPermission(user, { type: 'platform' }, 'content.edit')`. The
policy behind `content.edit` is membership in a small **allowlist of user IDs** configured
via env (`CONTENT_EDITOR_USER_IDS`) on the edit deployment — not a role.
- **Why (chosen over a dedicated role or reusing admin):** it names exactly which people
  may edit, grants *only* content editing (least privilege — the editor never gains admin
  powers), and adds **no role enum value, no migration, no schema residue** — deletable by
  removing the env var, matching the removability invariant. Reusing admin was rejected as
  over-privileged for an outside content person.
- **Convention-preserved:** call sites still use `hasPermission`; only the policy
  implementation for `content.edit` consults the allowlist. If self-service assignment is
  ever wanted, swap the backing to a dedicated `content-editor` role **without touching any
  call site**.
- **Identity, not possession:** stable user IDs (UUIDs), not emails. An empty/unset
  allowlist ⇒ no one is authorized (fail-closed) — which is also the production default,
  since the feature is off there anyway.

## Risks

- **Reverse-lookup ambiguity** on interpolated/duplicate strings → mitigated by the
  fallback searchable panel (D1); acceptable for a dev tool.
- **Stale overlay cache** on the edit deployment after a save → write-invalidate the cache
  in the same request that upserts (D3).
- **Token scope creep** → the PAT is fine-grained, single-repo, contents+PR only, and
  lives only on the edit deployment (D4/D7).
- **Publish conflicts** if the files changed since staging → the PR simply surfaces the
  diff for review; no silent overwrite of `dev`.

## Resolved
- **Publish reconciliation timing (decided):** publish does NOT clear staged overrides on
  PR open. Staged overrides are cleared when the PR is **merged** — a manual "mark
  published" step for v1, a GitHub webhook later — so staging keeps reflecting the
  live-but-unmerged copy until it actually lands in the files.
