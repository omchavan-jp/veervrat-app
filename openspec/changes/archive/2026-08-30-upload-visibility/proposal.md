## Why

**An image a vratarthi uploads to a private chat, or attaches to a personal experience log, is
readable by anyone on the internet who has its URL — permanently, and with no way to withdraw
that access.**

This was confirmed by exercising the path rather than by reading the code (2026-08-24, #178). A
real PNG uploaded through `POST /api/v1/uploads/experience` as a signed-in user returned:

```
https://veervratuatuploads.blob.core.windows.net/uploads/uploads/<uuid>.png
```

Fetching that URL with **no session cookie, no SAS token and no authentication header** returned
the file, byte-identical.

`documentation/22_Platform-Requirements.md` §6 states uploads are *"private by default, served
through the application rather than public bucket URLs."* The deployment does not do that.

The URLs are UUID-named, so they cannot be enumerated. But unguessable is not private, and the
distinction matters here in a specific way: **the URL is permanent and bearer-authorised.** Once
it appears in a forwarded message, a log line, a browser history, a screenshot, or a support
ticket, it grants access forever — surviving any later permission change, account deletion, or
anonymisation. `ops/data-map.md` §1 classes uploaded content alongside self-assessment material
as "the sensitive core", and names a mentor's notes about a person as more sensitive than their
email address. An image inside that material inherits the same weight.

### Why this is urgent now rather than later

**The uploads table is effectively empty.** Prod had no storage account until 2026-08-24, so no
upload can ever have succeeded there; UAT holds a single probe file from the verification above.

Every option below stays cheap only while that is true. The moment real content accumulates,
this becomes a data migration touching stored URLs inside chat messages and experience logs.

### The part that actually locks the decision in

The container being public (`container_access_type = "blob"`) is one line of Terraform.

The real constraint is that **the database stores an absolute public URL, not a storage key**:

```prisma
minioUrl  String  @map("minio_url")  // Public MinIO URL
```

`uploads.service.ts` calls `createUploadRecord(user.id, url, …)` and returns that same URL to the
client, which embeds it in chat messages and experience log bodies.

So "make uploads private" is not a configuration toggle. Every stored URL becomes wrong the
moment the access policy changes. The column name is also already inaccurate — both deployed
environments use Azure Blob, not MinIO.

## What Changes

**1. The database stores a storage key, never a URL.**

The single change that makes every other decision reversible. `uploads.minio_url` becomes
`uploads.storage_key`, holding `uploads/<uuid>.png` rather than an absolute URL. URLs are
generated at read time from the key.

This is worth doing on its own merits under *every* visibility policy, including "keep it
public" — it is what stops the next change being a migration.

**2. Visibility is decided per upload purpose, not globally.**

`UploadPurpose` already exists in `uploads.service.ts` and already distinguishes the three cases:

| Purpose | Visibility | Why |
|---|---|---|
| `blog` | **Public** | Blog posts are public content. A public, cacheable URL is correct, not a compromise |
| `experience` | **Private** | Personal reflection. `data-map` §1 sensitive core |
| `chat` | **Private** | Private conversation between a vratarthi and their vratmitra |

Treating all three identically is what forces a choice between over-exposing chat images and
needlessly signing blog images.

**3. Private purposes are served by short-lived signed URLs.**

`StorageProvider.signedUrl(key, expiresInSeconds)` already exists and is already implemented on
both the Azure Blob and S3/MinIO providers. This change gives it its first caller.

**4. Two storage-layer corrections, folded in because they are cheap now and awkward later.**

- The stored path duplicates the container name: `/uploads/uploads/<uuid>.png`. The container is
  `uploads` and the key prefix is also `uploads/`. Cosmetic, but it ends up inside every stored
  value.
- `minio_url` → `storage_key`, removing a column name that names the wrong technology.

## What This Does Not Change

- **The provider seam.** `StorageProvider` keeps exactly its four operations (#139). No new
  method is added; `signedUrl` simply acquires a caller.
- **The S3/MinIO local path.** It implements `signedUrl` already, so local development follows
  the same code path as deployed environments rather than diverging.
- **Whether prod's storage account works.** Deployed 2026-08-24 and still unexercised. Tracked
  separately; this change does not close it.
- **Retention or deletion of stored files.** Nothing deletes a blob today, and this change does
  not add it. `data-map` §2 records that gap and ties it to #140.

## Open question deliberately left open

The legal review (#134) may conclude that chat images require **instantly revocable** access
rather than short-lived signed URLs. That would mean proxying bytes through the API, which this
change does not implement — but which storing keys rather than URLs leaves available as a later
change to one method. The design records this explicitly so a future reader does not mistake the
signed-URL choice for a conclusion that proxying was rejected on the merits.
