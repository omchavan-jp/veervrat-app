# Integrations & Technical Constraints
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions

### Core Stack (locked)
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Monorepo:** pnpm workspaces + Turborepo
- **API style:** REST, cookie-based sessions

### Additional Infrastructure (v1)
- **Redis:** caching layer — session data, permission check results, test results in progress, auto-save state for active tests and journeys.
- **WebSockets:** real-time chat between VA and VM. NestJS Gateway (`@nestjs/websockets`). No external broker needed for v1.
- **Background scheduler:** `@nestjs/schedule` for dormant journey detection. Known v1 limitation: not safe across multiple instances without a distributed lock. Acceptable at v1 scale; flag for upgrade when horizontal scaling is needed.
- **Rate limiting:** `@nestjs/throttler` (built-in). No external service needed.

### Third-party Integrations (v1)
- **Error tracking:** GlitchTip — open-source, self-hostable, Sentry-SDK-compatible. Captures unhandled exceptions and frontend crashes with full stack traces.
- **Transactional email:** **JP IT's SMTP relay** (`notifications.jnanaprabodhini.org`) — revised 2026-08-17, was Resend; see D9 in `ops/PROJECT-STATUS.md`. Used for: VM invitations, notification emails, account actions. No per-month tier limit, and JP IT owns the sending domain's SPF/DKIM/DMARC. The low switch cost predicted here (one service file) is what made the change cheap — see B14.

### Notification Delivery
- **v1:** in-app (bell icon, unread count) + email. Both channels for: VM invitation, new ERC available, custom ERC approved/rejected, journey state changes.

### Storage & CDN
- **Object storage:** MinIO — open-source, self-hostable, S3-compatible API. Used for chat image uploads and any file attachments. Migration path to AWS S3 or Cloudflare R2 is a single config change.
- **CDN:** Cloudflare — doubles as CDN, DDoS protection, and proxy. Assets served from Cloudflare edge. No additional CDN service needed.
- **Link preview rendering:** server-side in NestJS — fetch Open Graph metadata on link paste, return thumbnail/title/description to client. No third-party service.
- **Chat limits (TBD):** file size limits, allowed file types, and retention policy for media in chat — to be decided.

### Internationalisation (i18n)
- UI is multilingual: English and Marathi (Devanagari) in v1. Architecture must support adding more languages without structural changes.
- Content (sentences, ERC descriptions) is bilingual EN/MR in the database.
- Language toggle persists per user preference.

### Hosting / Deployment
- Docker + GitHub Actions CI/CD. `docker-compose.yml` already exists.
- Cloudflare (CDN + DDoS protection) — covers storage CDN as well.
- Staging environment: required before production. Detail TBD in deployment phase.

### Explicitly Out of Scope for v1
- Kafka, RabbitMQ, SQS — no message queue needed at v1 scale.
- Lambda / serverless functions — monolith is fine for v1.
- Kubernetes — container orchestration not needed until horizontal scaling is required.
- DynamoDB — PostgreSQL covers all v1 needs.
- Payments — none.
- Analytics platform — none.
- Mobile / push notifications — web app only.
- TensorFlow / ML — suggestion algorithm enhancement is a future initiative.

## Open Questions (area-specific)
- Chat media: file size limits, allowed types, retention policy — TBD
- Distributed lock strategy for scheduler when scaling horizontally — TBD (not v1)
- Self-hosting vs. managed PostgreSQL — deferred to deployment phase
- Redis managed vs. self-hosted — deferred to deployment phase
- MinIO managed vs. self-hosted — deferred to deployment phase
- GlitchTip self-hosted setup — deferred to deployment phase

## Flags
- ⚠ `@nestjs/schedule` dormant job is not multi-instance safe. Must be revisited before horizontal scaling.
- ⚠ ~~Resend free tier (3k/month)~~ — obsolete (D9). JP's relay has no published tier limit, but its rate limits are **unknown**: ask JP IT before any bulk send.

### Media Limits (confirmed)
- **Images in chat and experience logs:** max 10MB per image, max 5 images per message/entry.
- **Allowed file types:** images only (JPG, PNG, GIF, WebP) for v1. No document/video uploads in chat or experience logs.
- **Media retention:** stored indefinitely in MinIO (no auto-purge in v1).
