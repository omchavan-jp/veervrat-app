## Context

Verified in the deployed system and in code before designing, not recalled:

- **`infra/terraform/modules/environment/storage.tf`** → `container_access_type = "blob"`, with a
  comment correctly stating that changing it is a product decision and was out of scope for #139.
- **`apps/api/prisma/schema.prisma`** → `model Upload { minioUrl String @map("minio_url") }`,
  commented `// Public MinIO URL`. Both deployed environments run Azure Blob.
- **`uploads.service.ts`** → builds `key = uploads/${randomUUID()}.${ext}`, calls
  `storage.put(key, …)`, then `createUploadRecord(user.id, url, …)` — storing the **URL** the
  provider returned, and returning that same URL to the client.
- **`uploads.service.ts`** → already takes `_purpose: UploadPurpose` (`'chat' | 'experience' |
  'blog'`) and currently ignores it, prefixed with `_` to say so.
- **`storage-provider.ts`** → four methods. `signedUrl(key, expiresInSeconds)` is implemented on
  both providers and has **no caller**.
- **Live check, UAT, 2026-08-24** → uploaded PNG fetched back over plain HTTPS with no
  credentials, byte-identical.

The container is `uploads` and the key prefix is also `uploads/`, producing
`/uploads/uploads/<uuid>.png`.

### Findings from section 1 of tasks.md (2026-08-24)

**1.1 — How many rows exist.** Neither database is reachable from a workstation (both Postgres
servers carry only the `AllowAzureServices` firewall rule), and `az containerapp exec` fails on
this machine with a TLS certificate error unrelated to Azure. Rather than open a firewall rule to
production for a row count, the answer was established from code and configuration history:

- `uploads.repository.createUploadRecord` is the **only** writer of the `Upload` table — no seed,
  no other call site.
- It runs only after `storage.put()` resolves; a failed put throws before any row is created.
- `git log -S "S3_ENDPOINT" -- infra/terraform/` is **empty across all history**: Terraform has
  never configured the S3 provider for the api in any environment.
- `AZURE_STORAGE_ACCOUNT_NAME` first appears in `0cbfc00` (#177), which reached UAT and prod on
  2026-08-24.

Therefore no upload could have succeeded in either environment before 2026-08-24. **Prod holds 0
rows; UAT holds 1** — the probe from #178's verification, which returned 201.

⚠️ This is a derivation, not a `SELECT count(*)`. Task 2.1's migration must still fail loudly on
any row it cannot convert; that guard runs where database access exists and is what this
derivation is trusted against, rather than instead of.

**The `SELECT count(*)` finally exists — 2026-08-30, and it broadly vindicates the derivation.**
Neither database became reachable; instead the nightly encrypted dumps were pulled out of Azure,
decrypted and restored locally, which answers row-count questions without opening a firewall to
production. That route is now the normal way to ask this kind of question — see
`DEPLOYMENT.md` → "Restoring from an off-site dump".

| | derived 2026-08-24 | measured 2026-08-30 |
|---|---|---|
| UAT | 1 | **11** |
| prod | 0 | **1** |

Both grew rather than contradicting: prod's single row is dated **2026-08-25**, the day after the
derivation, so "prod holds 0 rows" was true when written. The reasoning held; it was simply
describing a moment.

The premise it supports — that this change is cheap while the table is near-empty — still holds at
12 rows. But it is no longer *literally* empty, nothing slows the growth, and the difference
between 0 and 12 is the difference between "no migration" and "a migration that must not lose
anyone's image".

**1.2 — Where the URL is stored.** See decision 5, which this finding revised.

**1.3 — Whether `signedUrl` can work.** Both implementations read correctly: Azure mints a user
delegation SAS (never caching the delegation key, deliberately); S3/MinIO uses
`getSignedUrl(GetObjectCommand)`. The Azure path needs the **Storage Blob Delegator** role in
addition to Data Contributor, and both role assignments exist in `storage.tf` and are live on
`veervratuatuploads`. Confirmed by inspection and RBAC, **not** by calling either method — that
happens in section 6, against a deployed environment.

## Goals / Non-Goals

**Goals**
- A chat or experience image is not readable by an unauthenticated stranger holding a URL.
- Blog images stay publicly cacheable, because they are public content.
- Visibility policy becomes changeable later without a data migration.
- Local development exercises the same code path as deployed environments.

**Non-Goals**
- Adding a fifth method to `StorageProvider`. #139 sized that interface deliberately.
- Deleting stored blobs, or retention policy. Still absent, tracked in `data-map` §2 / #140.
- Access control on *who* may view a given image beyond the existing route authorisation.
- Exercising prod's storage account.

## Decisions

### 1. Store the key. Generate the URL at read time.

`uploads.minio_url` becomes `uploads.storage_key`, holding `uploads/<uuid>.png`.

This is the decision the whole change rests on. A stored absolute URL bakes today's visibility
policy into every row: change the policy and every stored value is wrong. A stored key names
*the object*, which does not change when the policy does.

It is worth doing **even if the answer to #178 had been "keep everything public"** — it is what
makes the next answer cheap instead of a migration.

**Considered and rejected:** keeping the URL and rewriting stored values when policy changes.
That is precisely the migration this avoids, and it would have to reach inside chat message and
experience log bodies where URLs are embedded in user content, not just the `uploads` table.

### 2. Visibility keyed on `UploadPurpose`, which already exists

`blog` → public. `experience`, `chat` → private.

The parameter is already threaded through and already ignored; this gives it meaning. A single
global policy would force a bad trade in one direction or the other: signing blog images buys
nothing and costs caching, while leaving chat images public is the defect this change exists to
fix.

**Considered and rejected:** a per-upload `isPublic` flag chosen by the caller. It moves a
security decision to the call site, where it can be got wrong per feature and drifts as new
callers appear. Purpose is a property of *what the image is for*, which is stable.

### 3. Two containers, not one container with mixed policy

`uploads` (private) and `uploads-public` (blob-level public read).

Azure sets anonymous access per container, so mixed visibility inside one container is not
expressible. Splitting makes the policy a property of the location: an object in the private
container cannot be accidentally public, whatever code does with it.

The key prefix drops the duplicated `uploads/` segment, since the container already says it.
Keys become `<uuid>.<ext>`.

**Considered and rejected:** one public container plus signed URLs for everything, relying on
signatures alone. It leaves the blobs themselves anonymously readable if a key ever leaks or a
signature is omitted — defence that depends on every call site being correct forever.

### 4. Signed URLs, with the proxy option kept open on purpose

Private purposes are served by `signedUrl(key, ttl)`. Initial TTL **15 minutes** — long enough to
load a page and re-render, short enough that a leaked URL is not a permanent grant.

A signed URL is still bearer-authorised for its lifetime. That is a real limitation, accepted
here because the alternative — proxying bytes through the API — costs API bandwidth, forfeits
CDN caching, and is materially more work for a benefit that matters mainly if access must be
revocable *instantly*.

**#134's legal review may conclude exactly that.** If it does, proxying becomes a change to one
method behind the existing seam, because the database stores keys rather than URLs. This is
recorded so a later reader does not mistake this decision for a considered rejection of proxying
on the merits — it is a staged choice, and decision 1 is what keeps the later stage cheap.

### 5. The stored `src` is a stable application URL, resolved per request

**Revised 2026-08-24 after task 1.2.** The original decision said message bodies should "resolve
to a signed URL at render time". Investigating the consumers showed that is the wrong shape.

What task 1.2 found:

- `chat-composer.tsx`, `experience-editor.tsx` and `blog-editor.tsx` all call
  `editor.chain().setImage({ src: url })`.
- `ChatMessage.body` and `ExperienceLog.body` are `Json  // Tiptap JSON AST`.

So the absolute blob URL is embedded **inside user content**, in a rich-text AST, across three
tables — not merely in the `uploads` row. Resolving at render time would mean walking that AST in
every renderer: chat list, experience log view, blog view, data export, notifications, and
anything added later. Each renderer that is missed silently serves a broken image, and the
failure appears only after the TTL elapses.

**Decision:** the `src` written into stored content is a stable, application-owned URL naming the
object:

```
/api/v1/uploads/<key>
```

The API resolves it per request: authorise, then redirect (302) to a freshly signed URL for
private purposes, or to the public URL for `blog`.

Consequences, all of them good:

- **Stored content never needs rewriting** — not when the TTL changes, not when visibility policy
  changes, not when the storage provider changes.
- **Policy lives server-side only.** No renderer, and no client, knows or decides anything.
- **Decision 4's staged path gets cheaper still.** If #134 requires instantly revocable access,
  this endpoint changes from *redirect* to *stream* — one method, no content migration, no
  frontend change.
- Expiry stops being a rendering concern: a browser follows the redirect on every load.

**Considered and rejected:** rewriting stored ASTs whenever policy changes. That is the migration
this whole change exists to avoid, made worse by living inside user content.

**Considered and rejected:** returning a raw key to the client and having the frontend build the
URL. It duplicates the visibility policy in the client, which is never a security boundary.

**Cost, stated honestly:** every private image view now costs an API request before the blob
request. That request is a cheap authorise-and-redirect, and it is the same request that buys
revocability later. Public blog images can redirect to a cacheable URL, so the common
high-volume case still benefits from CDN caching.

## Risks / Trade-offs

- **Existing rows.** The uploads table is believed to hold one probe row on UAT and none in prod
  (prod had no storage account until 2026-08-24). The migration MUST verify this rather than
  assume it, and MUST fail loudly rather than silently dropping data if rows exist that cannot be
  converted to keys.
- **Blog images move container.** Any already-stored blog URL keeps working only if the old
  container stays readable. With effectively no rows, the simplest correct answer is to migrate
  the one probe row or delete it.
- **TTL is a guess.** 15 minutes is chosen, not measured. If images visibly break on slow
  connections or long-open pages, the fix is a longer TTL or re-signing on render, not removing
  signing.
- **Local MinIO must match.** If the local provider's `signedUrl` behaves differently from
  Azure's SAS, development stops predicting production. Its behaviour is asserted in tests.
