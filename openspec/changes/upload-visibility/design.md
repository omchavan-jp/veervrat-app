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

### 5. The API returns a URL, not a key, to the client

The client keeps receiving `{ url }`. Only storage changes.

For private purposes that URL is signed and expires; a client holding a stale one re-requests the
resource rather than the blob. Returning raw keys would push URL construction into the frontend
and duplicate the visibility policy there.

**Consequence, stated plainly:** a signed URL embedded in a *stored* chat message body would
expire and break. Message bodies must therefore carry the key or an app-relative reference, and
resolve to a signed URL at render time. This is the one place the change reaches beyond the
uploads module, and is called out in tasks rather than discovered during implementation.

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
