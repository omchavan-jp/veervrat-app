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
- **Transactional email:** Resend — free tier (3,000 emails/month), simple API. Used for: VM invitations, notification emails, account actions. Switch cost is low (one service file) if outgrown.

### Notification Delivery
- **v1:** in-app (bell icon, unread count) + email. Both channels for: VM invitation, new ERC available, custom ERC approved/rejected, journey state changes.

### Hosting / Deployment
- Docker + GitHub Actions CI/CD. `docker-compose.yml` already exists.
- Cloudflare (CDN + DDoS protection) — deferred to deployment phase.
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
- Distributed lock strategy for scheduler when scaling horizontally — TBD (not v1)
- Self-hosting vs. managed PostgreSQL — deferred to deployment phase
- Redis managed vs. self-hosted — deferred to deployment phase
- GlitchTip self-hosted setup — deferred to deployment phase

## Flags
- ⚠ `@nestjs/schedule` dormant job is not multi-instance safe. Must be revisited before horizontal scaling.
- ⚠ Resend free tier (3k/month) — monitor usage, upgrade plan before limit is hit.
