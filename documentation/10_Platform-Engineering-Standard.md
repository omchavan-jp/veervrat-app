# Platform Engineering Standard — v1

This document is the canonical reference for all library, tooling, and architectural choices in Veervrat. When a decision is made here, it applies everywhere in the codebase — no exceptions without updating this document first.

---

## Approved Library Catalog

| Concern | Library | Package | Rationale |
|---|---|---|---|
| Rich text editor | Tiptap | `@tiptap/react`, `@tiptap/starter-kit` | ProseMirror-based, App Router compatible, JSON AST native, shadcn-friendly |
| Rich text — images | Tiptap Image extension | `@tiptap/extension-image` | Inline image nodes (`{type:'image',attrs:{src}}`) for chat/experience uploads. Src restricted to MinIO/CDN domain (see sanitization). |
| Rich text — entity references | Tiptap Mention extension | `@tiptap/extension-mention`, `@tiptap/suggestion` | Generic `@`/`#` entity-reference system (CONTEXT.md "Entity Reference") rendered as clickable chips. One mention node type with an `entityType` attr — not per-type handlers. |
| Popup positioning (suggestions) | Tippy.js | `tippy.js` | Positions the `@`/`#` suggestion dropdown at the caret with viewport flipping + collision handling. The positioning lib Tiptap's mention examples use. Scope: editor suggestion popups (not a general tooltip system). |
| Rich text storage format | Tiptap JSON AST | — | Stored as `jsonb` in PostgreSQL. Structural sanitization. Deterministic rendering. |
| Rich text sanitization | sanitize-html | `sanitize-html` | Server-side, node-allowlist based. Runs on all user-generated rich text before DB write. |
| i18n | next-intl | `next-intl` | App Router native, server-component-first, ICU message format, no URL-based locale routing |
| Animation | Framer Motion | `framer-motion` | Standard for App Router, declarative, composable with Tailwind |
| Dark mode | next-themes | `next-themes` | App Router compatible, class-based theme toggle, system preference default, localStorage persistence |
| Icons | lucide-react | `lucide-react` | Already in stack. Lined = default, filled = active. No mixing styles. |
| WebSocket (client) | Socket.IO client | `socket.io-client` | Pairs with NestJS Gateway, handles reconnect natively |
| WebSocket (server) | NestJS Gateway | `@nestjs/websockets`, `socket.io` | Native NestJS, cookie auth on handshake |
| WebSocket (multi-instance) | Socket.IO Redis adapter | `@socket.io/redis-adapter` | **Required before running more than one API replica.** Socket.IO keeps room membership in per-process memory, so without a shared backplane a message published on replica A never reaches a client connected to replica B — silently, with no error. Uses two duplicated `ioredis` clients (pub/sub) from the existing `REDIS_CLIENT`. |
| Background jobs (v1) | @nestjs/schedule | `@nestjs/schedule` | Single-instance cron. Known limitation: not multi-instance safe. |
| Background jobs / email delivery | **BullMQ** | `bullmq` ✅ | Adopted 2026-08-31 for email delivery (#141). Redis-backed, so it reuses the existing `REDIS_CLIENT` and adds no infrastructure — deliberately not a managed broker such as Azure Service Bus, which would be provider-specific with no benefit at this scale (`22_Platform-Requirements.md` §11). The producer runs in the request; the **worker runs in the same API process**, which is right at this volume and has one consequence worth knowing: on an environment with `min_replicas = 0` a scheduled retry does not run until something wakes the container. See `19_Email-Strategy.md`. A dedicated worker container with a Redis queue-depth scale rule is the answer when volume justifies it, not before.  ⚠️ **CLUSTERED REDIS: use hash tag prefixes.** Azure Managed Redis runs in cluster mode even at the smallest tier. BullMQ's Lua scripts touch multiple keys atomically; without a hash tag, keys land in different slots and every operation fails with `CROSSSLOT`. Set `prefix: '{queuename}'` (with literal braces) on both `Queue` and `Worker`. This cost ₹19,230 in 12 hours of Log Analytics ingestion before being caught (2026-09-02, `21_Infrastructure-Conventions.md` §26).  ⚠️ BullMQ pulls in `msgpackr-extract`, an optional **native** accelerator for msgpack encoding. Its build script is declined in the root `package.json` (`pnpm.ignoredBuiltDependencies`): `msgpackr` falls back to pure JS without it, and a node-gyp compile in CI and in the Docker build is a real cost for an encoding speed-up nothing here needs. Declining it is deliberate — pnpm otherwise fails `install` with `ERR_PNPM_IGNORED_BUILDS`, which looks like a broken lockfile rather than a choice. |
| Email transport | **SMTP (JP IT relay)** | `nodemailer` ✅ | Replaced Resend per D9, shipped 2026-08-17; `resend` removed. Port 587 STARTTLS: `secure: false, requireTLS: true`. Console logging in local dev. |
| Email templates | React Email | `@react-email/components`, `react`, `react-dom` | JSX-based, type-safe, renders HTML + plain text, bilingual support. |
| Error tracking | **Sentry** (free tier, EU region) | `@sentry/node` (api), `@sentry/nextjs` (web) | D8 — GlitchTip dropped 2026-08. Reads `SENTRY_DSN` from Key Vault on the api; on the web the DSN is threaded through `RuntimeConfig`, never `NEXT_PUBLIC_SENTRY_DSN` — that is inlined at build time and the same image is promoted UAT → prod unchanged (§17). Both DSNs are set per environment, out of band, never in Terraform state |
| Platform telemetry | **Dropped** (2026-08-23) | — | Was going to be Azure Application Insights; never started, and would have been the one Azure-coupled piece of an otherwise portable stack. See `18_Observability-Standard.md` for the full reasoning |
| Object storage | Azure Blob (deployed), MinIO/S3-compatible (local) | `@azure/storage-blob`, `@azure/identity`; `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | #139 (O15) — `uploads.service.ts` depends only on a `StorageProvider` interface (put/get/delete/signedUrl), never an SDK directly. A factory (`storage-provider.factory.ts`) selects the implementation by which environment variables are present: `AZURE_STORAGE_ACCOUNT_NAME`+`AZURE_STORAGE_CONTAINER_NAME`+`AZURE_CLIENT_ID` selects Azure Blob, `S3_*` selects S3/MinIO, neither present means every operation refuses with a clear error rather than the app silently doing nothing. Azure is reached with the api's existing managed identity — no access key exists anywhere for it. |
| HEIC→JPEG conversion | heic-convert | `heic-convert` | Converts iPhone HEIC/HEIF uploads to JPEG server-side (Chrome/Firefox can't render HEIC). Pure-JS (libheif/wasm) — no native/libvips build. **Kept alongside sharp**: sharp's prebuilt binaries do not reliably carry HEIC support (licensing), so HEIC is decoded here first and handed on as JPEG. |
| Image processing | **sharp** (libvips) | `sharp` | #189 — every upload is decoded, EXIF orientation applied, **all metadata stripped** (phone photos carry GPS coordinates, and a public experience log would otherwise publish where a picture was taken), downscaled to a maximum dimension, and re-encoded. Decoding is also what makes format detection real: sharp reports the format the bytes actually are, replacing a `mimeType` field the client set. Native (libvips) with prebuilt amd64 binaries — matches the runtime image; verify in the built image, not only under `pnpm dev`. |
| Search | **Under revision — see #194** | `meilisearch` (installed, unprovisioned) | ⚠️ This row said "Already decided". That decision is being reversed: Meilisearch has never been provisioned in any environment, and costing it on Container Apps (~₹1,850–3,700/month for both) does not justify three read paths at beta scale. The proposal is to serve them from **PostgreSQL `pg_trgm`**, which already backs entity search. Do not provision Meilisearch on the strength of this row. |
| Validation (backend) | class-validator + class-transformer | `class-validator`, `class-transformer` | Already in stack. All DTOs use this. |
| Validation (frontend) | Zod | `zod` | Already in stack. All forms use React Hook Form + Zod. |
| Date picker | shadcn Calendar + react-day-picker | `react-day-picker` (peer dep of shadcn) | Custom calendar popup via shadcn Calendar + Popover, styled to design tokens. date-fns for date formatting. Use `DatePicker` wrapper at `components/ui/date-picker.tsx`. |
| Date utilities | date-fns | `date-fns` | Installed as peer dep of react-day-picker. Use for date formatting/parsing in date picker only. Do not add moment.js or dayjs. |
| Structured logging (backend) | nestjs-pino + pino-http | `nestjs-pino`, `pino-http`, `pino-pretty` (dev) | NestJS LoggerService adapter for Pino. pino-http attaches request context. pino-pretty for human-readable dev output. |
| Config validation | Joi | `joi` | Validates required env vars at startup via ConfigModule validationSchema. Fail-fast on missing config. |
| Redis client | ioredis | `ioredis` | Used for account lockout, OG cache TTL, throttler storage, the Socket.IO backplane, and the BullMQ email queue. Injected as `REDIS_CLIENT` provider. |
| Rate limiting | @nestjs/throttler | `@nestjs/throttler` | NestJS-native, per-route overrides via `@Throttle()`, global guard in AppModule. |
| Rate limiting — shared storage | Redis throttler storage | `@nest-lab/throttler-storage-redis` | **Required for correctness on more than one replica.** The default storage is per-process memory, so N replicas allow N× the intended limit and every deploy resets the counters — a security control that silently weakens exactly as you scale. Redis-backed storage makes limits global and deploy-durable. Reuses the existing `REDIS_CLIENT`. |
| HTTP security headers | helmet | `helmet` | Sets X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, etc. Applied once in `configureApp`. API serves JSON only, so CSP is left to the frontend layer. |

---

## Rich Text

### Storage
- Format: **Tiptap JSON AST** (`jsonb` column in PostgreSQL)
- Never store HTML or Markdown — only the JSON document object
- Plain text extraction for search indexing: use `@tiptap/extension-document` + `generateText()`

### Sanitization
- All user-generated rich text is sanitized **server-side before DB write**
- Library: `sanitize-html`
- Allowed node types (whitelist): paragraph, heading (h2–h4), bold, italic, link, image, bulletList, orderedList, listItem, blockquote, hardBreak
- Links: must be `http://` or `https://` only. No `javascript:`. Rel: `noopener noreferrer nofollow`
- Images: only URLs from MinIO/CDN domain. External image URLs are rejected.
- No `<script>`, `<iframe>`, `<style>`, `<form>` — ever.

### Rendering
- Server components: use Tiptap's `generateHTML()` on the stored JSON
- Always re-sanitize before rendering if the content originated from external input
- Apply Tailwind `prose` class for typography styling

---

## Internationalisation (i18n)

### Library: next-intl

### Language model
- Language is a **user preference** (stored in DB, applied via middleware)
- No URL-based locale routing (`/mr/dashboard` — not used)
- Middleware reads user session → sets locale → injects into layout
- Guests: browser `Accept-Language` header → default to English if not MR

### File structure
```
apps/web/
  messages/
    en.json     ← English UI strings
    mr.json     ← Marathi UI strings
```

### Rules
- All UI labels (buttons, nav, headings, error messages, empty states) must be in message files
- Content (sentences, ERC descriptions, shlokas) is **bilingual in the DB** — both EN and MR fields stored separately, both rendered together — not toggled via i18n
- Server components: use `getTranslations()` (async)
- Client components: use `useTranslations()` hook
- Message keys: dot-notation, scoped by page/component (`journey.status.active`, `nav.actions`)
- ICU format for plurals and interpolation

---

## WebSocket (Chat & Real-time)

### Stack: NestJS Gateway + Socket.IO

### Authentication
- Session cookie is reused for WebSocket handshake — no separate token
- NestJS Gateway middleware validates the session cookie on connection
- Unauthenticated connections are rejected immediately

### Room model
- One room per VA-VM pair: `chat:${[userId1, userId2].sort().join(':')}`
- On connect: server joins the user to all their chat rooms automatically
- No explicit room join/leave from client

### Message contract
```typescript
// Client → Server
{ type: 'message', roomId: string, content: TiptapJSON, tempId: string }

// Server → Client (broadcast to room)
{ type: 'message', id: string, roomId: string, senderId: string, content: TiptapJSON, createdAt: string, seqNo: number }

// Server → Client (ack)
{ type: 'ack', tempId: string, id: string, seqNo: number }
```

### Reconnect behavior
- Client: exponential backoff — 1s, 2s, 4s, 8s, 16s, max 30s, indefinite retries
- On reconnect: client sends `lastSeqNo` → server responds with missed messages via REST (`GET /api/v1/chats/:roomId/messages?after=seqNo`)
- No message replay over socket — REST for catch-up

### Ordering
- Server assigns monotonically increasing `seqNo` per room
- Client reorders if gap detected (out-of-order delivery)

### Notifications (real-time)
- Separate event type: `{ type: 'notification', ...notificationPayload }`
- User joins a personal notification room: `notifications:${userId}` on connect

### v1 Scope (not implemented)
- No typing indicators
- No read receipts
- No presence heartbeat beyond online indicator (updated on connect/disconnect)

---

## Search Architecture

### Stack: Meilisearch

### Indices

| Index | Searchable fields | Filter attributes | Updated by |
|---|---|---|---|
| `users` | display_name, username | is_public | User profile update event |
| `weaknesses` | name_en, name_mr, description_en | — | Admin content update |
| `virtues` | name_en, name_mr | — | Admin content update |
| `subvirtues` | name_en, name_mr | virtue_id | Admin content update |
| `sentences` | text_en, text_mr | subvirtue_id | Admin content update |
| `shlokas` | devanagari_text, transliteration, meaning_en, meaning_mr, loose_tags | — | Admin content update |
| `blogs` | title, body_plain_text, author_display_name | status | Blog publish/unpublish event |
| `experience_logs` | body_plain_text | visibility | Log publish/visibility change |
| `resources` | title, one_liner, description_plain_text | — | Admin content update |

### Auth-aware filtering
- `users` index: `is_public = true` always applied (private profiles excluded)
- `blogs` index: `status = published` always applied
- `experience_logs` index: `visibility = public` always applied
- No private or friends-tier content is ever indexed

### Indexing jobs
- Triggered by domain events (NestJS EventEmitter) after DB commit
- Not synchronous — search is eventually consistent (acceptable)
- On content delete/hide: remove from index immediately (not eventual)

### Devanagari
- Meilisearch supports Unicode natively — no special normalization needed
- Both `name_en`/`name_mr` fields searchable simultaneously

### User search (VM invitation)
- Searches `users` index only
- Fuzzy match on display_name and username
- Exact match on full email (separate DB query — email not indexed in Meilisearch for privacy)

### Client & sync conventions (implementation)
- SDK: official `meilisearch` JS client. Wrapped by a global `SearchModule` exposing `MeiliService` (typed client from `MEILI_HOST` + `MEILI_MASTER_KEY` config). No module touches the raw client directly — each index has an `<Entity>IndexService` (e.g. `UsersIndexService`) owning `ensureIndex`/`upsert`/`remove`/`search`.
- **Config:** `MEILI_HOST` and `MEILI_MASTER_KEY` validated at startup (Joi). If unset/unreachable, `MeiliService` no-ops with a warning and `search` returns empty — the app still runs (mirrors how `UploadsService` degrades without MinIO). Never let a search dependency fail a core write.
- **Sync:** fire **after** the DB commit, best-effort — sync failures are logged, never thrown into the write path (search is eventually consistent). `ensureIndex` runs at boot; a bounded idempotent seed of existing rows keeps the index warm without a manual reindex.
- **Never index PII or private content:** emails are never indexed (exact-email is a DB lookup); private/friends-tier content is never indexed; `is_public`-style flags are filterable attributes applied on every query.

---

## Background Jobs

### v1: @nestjs/schedule
- Single-instance cron. Not distributed.
- Known limitation: if multiple instances run, all instances fire the job.
- Acceptable at v1 scale (single instance deployment).
- Dormant journey detection: runs daily at 02:00 local server time.

### v2 upgrade path: dedicated BullMQ worker
- BullMQ is already in use for email delivery (adopted 2026-08-31, #141). The worker runs
  in-process in the API container. When horizontal scaling is needed, extract the worker into
  its own container with a Redis queue-depth scale rule.
- For scheduled tasks (cron), @nestjs/schedule is still used. Replace with BullMQ repeatable
  jobs when distributed locks are needed.

---

## Security Baseline

### Upload validation
- **File type determined by decoding the image, not by what the caller says it is.** `sharp`
  reports the actual format; anything that does not decode is refused.

  ⚠️ **This line previously claimed the type was "sniffed server-side" and it was not true**
  (found 2026-08-25, #189). `uploads.service.ts` checked `request.mimeType` — a field in the JSON
  body, chosen by the caller — so arbitrary bytes could be stored and served as `image/png`. The
  claim was wrong twice: not sniffed, and not even a header. Corrected only once the code
  actually did it.
- Allowed MIME types (v1): `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`
- **HEIC/HEIF** (iPhone default) is accepted but **converted to JPEG server-side** via `heic-convert` before storage — Chrome/Firefox cannot render HEIC in `<img>`. Stored as `.jpg`.
- **All metadata is stripped, including GPS.** Phone cameras record where and when a photo was
  taken; a public experience log would otherwise publish that alongside the picture, which nobody
  chose. EXIF orientation is **applied first and then discarded** — stripping without applying it
  turns every portrait photo sideways, because the rotation flag lives in the data being removed.
- **Downscaled** beyond a maximum dimension. A 12MP phone photo is several megabytes and nothing
  in a reflection needs that — and since #178 private images stream through the api, every byte
  is api bandwidth rather than storage egress.
- Max file size: 10MB per file
- Max files per request: 5
- Files stored in MinIO with randomized path (`uploads/{uuid}.{ext}`) — never the original filename
- Virus scanning: not in v1. Acceptable risk for image-only uploads from authenticated users. Add ClamAV in v2.

### OG metadata fetch (link previews)
- Fetched server-side by NestJS
- SSRF protection: resolve hostname → block private IP ranges (10.x, 172.16.x, 192.168.x, 127.x, ::1)
- Timeout: 5 seconds
- Max response body: 1MB
- Only fetch `<meta>` tags — never execute JS
- Cache OG results: 24 hours in Redis

### Rate limiting (@nestjs/throttler)
| Route | Limit |
|---|---|
| `POST /auth/login` | 10 req / 15 min per IP |
| `POST /auth/signup` | 5 req / 1 hour per IP |
| `POST /auth/forgot-password` | 5 req / 1 hour per IP |
| `POST /api/v1/search/*` | 60 req / min per user |
| `POST /api/v1/uploads/*` | 20 req / hour per user |
| All other authenticated routes | 300 req / min per user |
| All other unauthenticated routes | 60 req / min per IP |

### CSRF
- Strategy: **double-submit cookie**
- NestJS generates a CSRF token on session creation, sets it as a non-HttpOnly cookie (`csrf-token`)
- Frontend reads this cookie and sends it as `X-CSRF-Token` header on all state-changing requests
- NestJS guard validates header matches cookie value
- `SameSite=Lax` on session cookie as additional defense

---

## Numeric Constants (locked)

| Constant | Value | Where used |
|---|---|---|
| Journey dormant trigger | 30 days | Background job |
| Platform stats cache TTL | 60 minutes | Redis |
| Notification retention | 90 days | Soft-archive job |
| VM invite expiry | 7 days | Invitation table |
| Platform invite expiry | 30 days | Invitation table |
| Chat media max size | 10 MB | Upload middleware |
| Chat media max count | 5 per message | Upload middleware |
| OG fetch timeout | 5 seconds | Link preview service |
| OG fetch max body | 1 MB | Link preview service |
| OG cache TTL | 24 hours | Redis |
| Rate limit: login | 10 req / 15 min | Throttler |
| Rate limit: signup | 5 req / 1 hour | Throttler |
