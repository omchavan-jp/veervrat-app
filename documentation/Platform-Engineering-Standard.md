# Platform Engineering Standard — v1

This document is the canonical reference for all library, tooling, and architectural choices in Veervrat. When a decision is made here, it applies everywhere in the codebase — no exceptions without updating this document first.

---

## Approved Library Catalog

| Concern | Library | Package | Rationale |
|---|---|---|---|
| Rich text editor | Tiptap | `@tiptap/react`, `@tiptap/starter-kit` | ProseMirror-based, App Router compatible, JSON AST native, shadcn-friendly |
| Rich text storage format | Tiptap JSON AST | — | Stored as `jsonb` in PostgreSQL. Structural sanitization. Deterministic rendering. |
| Rich text sanitization | sanitize-html | `sanitize-html` | Server-side, node-allowlist based. Runs on all user-generated rich text before DB write. |
| i18n | next-intl | `next-intl` | App Router native, server-component-first, ICU message format, no URL-based locale routing |
| Animation | Framer Motion | `framer-motion` | Standard for App Router, declarative, composable with Tailwind |
| Icons | lucide-react | `lucide-react` | Already in stack. Lined = default, filled = active. No mixing styles. |
| WebSocket (client) | Socket.IO client | `socket.io-client` | Pairs with NestJS Gateway, handles reconnect natively |
| WebSocket (server) | NestJS Gateway | `@nestjs/websockets`, `socket.io` | Native NestJS, cookie auth on handshake |
| Background jobs (v1) | @nestjs/schedule | `@nestjs/schedule` | Single-instance cron. Known limitation: not multi-instance safe. |
| Background jobs (v2 path) | BullMQ | `bullmq` | Upgrade path when horizontal scaling is needed. Redis-backed. |
| Email provider | Resend SDK | `resend` | Free tier: 3k/month. Console logging in local dev. |
| Email templates | React Email | `@react-email/components`, `react`, `react-dom` | JSX-based, type-safe, renders HTML + plain text, bilingual support. |
| Error tracking | GlitchTip (Sentry SDK) | `@sentry/nextjs`, `@sentry/node` | Open-source, self-hostable, Sentry-compatible SDK |
| Object storage client | AWS SDK S3 compatible | `@aws-sdk/client-s3` | Works with MinIO (S3-compatible API). Provider-agnostic. |
| Search | Meilisearch | `meilisearch` | Already decided. See Search Architecture doc. |
| Validation (backend) | class-validator + class-transformer | `class-validator`, `class-transformer` | Already in stack. All DTOs use this. |
| Validation (frontend) | Zod | `zod` | Already in stack. All forms use React Hook Form + Zod. |
| Structured logging (backend) | nestjs-pino + pino-http | `nestjs-pino`, `pino-http`, `pino-pretty` (dev) | NestJS LoggerService adapter for Pino. pino-http attaches request context. pino-pretty for human-readable dev output. |
| Config validation | Joi | `joi` | Validates required env vars at startup via ConfigModule validationSchema. Fail-fast on missing config. |
| Redis client | ioredis | `ioredis` | Used for account lockout, OG cache TTL, and future BullMQ upgrade. Injected as `REDIS_CLIENT` provider. |
| Rate limiting | @nestjs/throttler | `@nestjs/throttler` | NestJS-native, per-route overrides via `@Throttle()`, global guard in AppModule. |

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

---

## Background Jobs

### v1: @nestjs/schedule
- Single-instance cron. Not distributed.
- Known limitation: if multiple instances run, all instances fire the job.
- Acceptable at v1 scale (single instance deployment).
- Dormant journey detection: runs daily at 02:00 local server time.

### v2 upgrade path: BullMQ
- When horizontal scaling is needed, replace @nestjs/schedule with BullMQ (Redis-backed, distributed locks built in).
- Job definitions live in `src/jobs/` — designed to be portable.

---

## Security Baseline

### Upload validation
- MIME type sniffed server-side (not trusted from client Content-Type header)
- Allowed MIME types (v1): `image/jpeg`, `image/png`, `image/gif`, `image/webp`
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
