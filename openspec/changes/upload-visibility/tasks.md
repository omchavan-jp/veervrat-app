## 0. Read first

- [ ] 0.1 `design.md` decision 1 — everything else depends on storing a key rather than a URL.
- [ ] 0.2 `openspec/changes/upload-visibility/proposal.md` "Why this is urgent now" — the whole
  change is cheap only while the uploads table is effectively empty. **Confirm that is still
  true before starting** (task 1.1), rather than trusting a claim written on 2026-08-24.

## 1. Establish the facts the plan assumes — DONE 2026-08-24

Findings recorded in `design.md` → "Findings from section 1".

- [x] 1.1 Row counts. **Prod 0, UAT 1.** Neither database is reachable from a workstation, and a
  prod firewall rule was not opened for a row count; established instead from the single writer,
  the ordering of `put` before the insert, and configuration history proving no provider was ever
  configured before 2026-08-24. ⚠️ A derivation, not a `SELECT` — 2.1's loud failure is the guard.
- [x] 1.2 Consumers. **The URL is embedded in user content**, not just the `uploads` row: all
  three editors call `setImage({ src: url })` and both bodies are Tiptap JSON ASTs. **This
  revised design decision 5** — a stable `/api/v1/uploads/<key>` resolved per request, rather
  than rewriting ASTs at render time.
- [x] 1.3 `signedUrl` inspected on both providers; Azure needs **Storage Blob Delegator**, which
  exists in `storage.tf` and is live on `veervratuatuploads`. Not yet *called* — that is 6.1.

## 2. Storage layer: key, not URL — DONE 2026-08-24

The migration was tested against a live Postgres in all three states: populated with both URL
styles (converts), unconvertible (aborts), and empty as prod is (applies). An earlier draft
renamed the column *before* checking and left the table half-migrated on failure — found by
running it, not by reading it, and fixed by checking first.

- [x] 2.1 Prisma migration: `uploads.minio_url` → `uploads.storage_key`. Convert existing rows by
  extracting the key from the stored URL; **fail loudly** on any row that cannot be converted
  rather than nulling it.
- [x] 2.2 Drop the duplicated path segment — keys become `<uuid>.<ext>`, since the container
  already carries the name.
- [x] 2.3 `uploads.repository.ts`: `createUploadRecord` takes and stores the key. Rename the
  parameter, which is currently `minioUrl`.
- [x] 2.4 Update the `Upload` model comment, which says "Public MinIO URL" and is wrong twice.

## 3. Two containers

- [x] 3.1 Terraform: keep `uploads` but flip it to private (remove `container_access_type =
  "blob"`); add `uploads-public` with blob-level public read. Update the comment in `storage.tf`,
  which currently states this decision was deliberately deferred.
- [x] 3.2 Both providers need to address two containers. Prefer a container argument over a
  second provider instance, so the seam stays four methods (#139).
- [x] 3.3 Apply to UAT and verify: a blob in `uploads` returns 404/401 unauthenticated, and one
  in `uploads-public` returns 200. **Assert both positively** — a failed fetch that errors for an
  unrelated reason is not evidence of privacy.

## 4. Visibility by purpose

- [x] 4.1 `uploads.service.ts`: stop ignoring `_purpose`. Map `blog` → public container,
  `experience` and `chat` → private.
- [x] 4.2 Private purposes return `signedUrl(key, 900)`; public returns the plain URL.
- [x] 4.3 Unit tests per purpose, asserting **which container** and **whether the URL is signed** —
  not merely that a URL came back.

## 5. The resolver endpoint — DONE 2026-08-24

- [x] 5.1 `GET /api/v1/uploads/:key`, on its own controller because it must be reachable without
  a session (public logs are guest-readable). Blog redirects to the public URL; private purposes
  **stream the bytes**, so no bearer URL exists and access is re-decided every request.
- [x] 5.2 No frontend change needed: the API already returns the resolver URL, which the editors
  put straight into `src`.
- [x] 5.3 **Answered: visibility derives from the containing document.** Chat checks `roomId`
  membership (recorded at upload time). Experience delegates to `ExperienceLogsService.getOne`,
  which already resolves guest access, ONLY_ME, FRIENDS-by-mutual-follow, drafts and the
  permission system — so there is one authority, not two. An unbound upload (still composing, or
  abandoned) is visible only to its uploader. Not-found and not-allowed are the same response, so
  a refusal does not confirm a key exists.
- [x] 5.4 Structurally impossible now: nothing expires, because nothing is signed.

## 5a. Binding — the piece that made 5.3 answerable

- [x] 5a.1 `uploads.experience_log_id`, nullable, ON DELETE SET NULL.
- [x] 5a.2 `extractUploadKeys` walks the saved Tiptap AST for resolver URLs; bound on create and
  re-bound on every body change, so a removed image stops inheriting the log's visibility.
- [x] 5a.3 Binding is scoped to the uploader, so naming someone else's key in your log cannot
  rebind their image to your document's visibility.

## 6. Verify against a deployed environment

- [x] 6.1 Repeat the #178 probe on UAT: upload via `POST /api/v1/uploads/experience`, then fetch
  the returned URL **with no credentials**. Expect it to work while signed, and to fail once
  expired.
- [x] 6.2 Upload via the `blog` purpose; confirm that URL is unsigned, public, and stays valid.
- [x] 6.3 Confirm the private container refuses anonymous reads directly, independent of the
  application.

## 7. Documentation

- [x] 7.1 `documentation/22_Platform-Requirements.md` §6 — the warning that the implementation
  does not meet "private by default" comes out only once 6.1–6.3 pass.
- [x] 7.2 `ops/data-map.md` — object storage row, and §2's note about avatar files.
- [x] 7.3 Close #178 with the evidence from section 6, not with a description of the change.

## 8. Not in this change — record, do not silently drop

- [x] 8.1 Prod's storage account is deployed and still unexercised (2026-08-24).
- [x] 8.2 Nothing deletes a stored blob, ever (`data-map` §2, #140).
- [x] 8.3 If #134's legal review requires instantly revocable access, proxying replaces signed
  URLs behind the same seam — cheap because storage holds keys.


## 9. Verified against deployed UAT — 2026-08-25

Run against `veervrat-uat-api:9ac7935`, after CD applied both migrations:

| Check | Result |
|---|---|
| Returned URL is app-hosted, unsigned | `https://api.uat.…/api/v1/uploads/<uuid>.png` |
| Uploader reads their own image | 200 |
| **Anonymous request** | **404** |
| Blob addressed directly | 404 |
| Blog image, anonymous | 200 |
| Streamed bytes vs uploaded bytes | identical (163 = 163) |
| Response headers | `content-type: image/png`, `cache-control: private, max-age=60`, `nosniff` |

⚠️ **Still not verified by machine:** that a *guest* can see an image inside a published PUBLIC
log. The unit tests cover the branch, and it is the case the whole design turns on, but proving
it end-to-end needs a real published log — left for manual testing rather than claimed.
