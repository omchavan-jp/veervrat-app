# System Decisions & Status

This is the master reference for all technology and architecture decisions. Read this first to understand where the project stands.

Production follow-up, 2026-10-15: the maintainer reported "Everything is working in prod."
This is owner-reported acceptance after `prod-2026-10-12`, separate from automated release
health checks. It does not assert an individually witnessed OAuth/WebSocket/Sentry/restore
test matrix. See [release evidence and limits](../ops/release-controls-rollout.md).

## Stack overview

> **Status vocabulary corrected 2026-08-16.** This table read "Scaffolded" across the board
> for an application that is **built and deployed** — 30 API modules, 35 archived openspec
> changes, live on Azure UAT. "Scaffolded" was accurate in June and never revisited.

| Layer | Choice | Status |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | ✅ Built and deployed |
| Backend | NestJS + TypeScript | ✅ Built and deployed — 30 domain modules |
| Database | PostgreSQL | ✅ Live — Azure Flexible Server v18 (UAT + prod), docker-compose locally |
| ORM | Prisma | ✅ Built — driver adapter (`PrismaPg`), explicit pool sizing |
| Cache / sessions store | Redis | ✅ Live — Azure Managed Redis; rate limits, lockout, Socket.IO adapter |
| Search | Meilisearch | Decided, **deferred** — runs in docker-compose locally, **not deployed**; search degrades gracefully |
| File storage | MinIO locally · **Azure Blob** in cloud | Implemented through `StorageProvider`; `content-overrides.repository.ts` now injects that seam rather than importing S3 directly (source checked 2026-10-12). Historical upload/read-back verification was on UAT; no fresh production upload/content-editing test is claimed by release health checks. |
| Hosting | **Azure** (Container Apps, Central India) | UAT and production are serving the owner-accepted digest set from `prod-2026-10-12`; fresh DB/Redis readiness and actual served web/API wiring passed on 2026-10-12. Production browser flows were not freshly tested by that deployment verification. See [runbook](../DEPLOYMENT.md). |
| CI / CD | GitHub Actions | See [workflows](../.github/workflows/README.md) for execution and [governance rollout](../ops/github-governance-status.md) for enforced merge/release controls. |
| Observability | Sentry (app errors) + stdout logs | Historical Sentry delivery verification is recorded for API (UAT/prod) and UAT web. Production web now has `SENTRY_DSN` configured after `prod-2026-10-12` (Azure read-back 2026-10-12); fresh production Sentry delivery was not tested. Azure Application Insights is dropped; see [observability standard](18_Observability-Standard.md). |
| Rich text editor | Tiptap + JSON AST storage | ✅ Built |
| i18n | next-intl | ✅ Built — no URL routing, user preference, en + mr |
| WebSocket | NestJS Gateway + Socket.IO | Built with the Redis adapter. The historical web rewrite proxy blocker was removed; current web runtime advertises the production API directly. No fresh end-to-end production WebSocket test is claimed by release health verification. |
| Animation | Framer Motion | ✅ Built |
| Background jobs | @nestjs/schedule (v1), BullMQ path (v2) | ✅ Built — dormant-journeys + notifications crons |
| Auth | Custom in NestJS (cookie sessions, OAuth + credentials) | Built — see `openspec/specs/auth/spec.md`. Historical Google configuration/sign-in evidence from 2026-08-18 supersedes the earlier placeholder warning. Owner reported successful UAT login/logout and password reset for the 2026-10-12 release; fresh production browser/OAuth flow verification is not claimed. |
| Email | **JP IT SMTP relay** (cloud) + console logging (local dev) | Historical real-message delivery was verified in August; the old placeholder warning was superseded by the later configured-secret deployment record. Owner reported successful UAT password reset on 2026-10-12. Fresh production SMTP delivery was not tested as part of infrastructure/health verification. |
| Monorepo | pnpm workspaces + Turborepo | ✅ Built |
| UI | Tailwind CSS (v4, CSS-first) + shadcn/ui | ✅ Built — design system implemented, see 15 |
| API style | REST | ✅ Built — `/api/v1/`, `{ data }` envelope |

## Architecture decisions

### 1. Modular monolith
**Decision**: single deployable backend, not microservices.
**Why**: solo dev, evolving domain, tightly related features. Premature service splitting slows down iteration.

### 2. Next.js + NestJS (separate frontend and backend)
**Decision**: Next.js for frontend, NestJS for backend — not Next.js fullstack.
**Why**: the app has nuanced authorization, sensitive data, domain workflows, background jobs, and mentor/admin tooling. A dedicated backend prevents messy server-action sprawl and centralizes auth enforcement.

### 3. PostgreSQL + Prisma
**Decision**: PostgreSQL as the database, Prisma as the ORM.
**Why**: strong relational modeling for workflows and permissions. Prisma chosen over Drizzle for faster productivity and mature ecosystem. Prisma is confined to the repository layer — it's a data access tool, not the domain model.

### 4. REST over GraphQL
**Decision**: REST API.
**Why**: simpler contracts, clearer auth debugging, easier role/scoped access handling. NestJS fits REST naturally.

### 5. Cookie-based sessions over JWT
**Decision**: secure cookie-based sessions stored in PostgreSQL.
**Why**: server-side session invalidation (logout, password reset), no token refresh complexity, CSRF is manageable. Redis not needed initially.
**Details**: see `14_Auth-Architecture-Decision.md`

### 6. Auth owned by NestJS
**Decision**: NestJS is the source of truth for authentication. Next.js is only the UI layer.
**Why**: centralizes auth logic, avoids framework lock-in, clearer security boundary. No Auth.js or Clerk — custom implementation.
**Details**: see `14_Auth-Architecture-Decision.md`

### 7. Google OAuth + email/password
**Decision**: support Google OAuth and email/password login initially.
**Why**: covers the two most common auth methods. Architecture supports adding more OAuth providers later.
**Account linking**: no auto-link on email match — requires explicit confirmation.

### 8. Email via JP IT's SMTP relay + console logging for dev
**Decision** (revised 2026-08-17, D9): send through **JP IT's own SMTP relay**
(`dhoomketu.in:587`, STARTTLS) as
`Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>`. Console logging for local
development.

**Why the change from Resend**: the relay sends as a subdomain dedicated to automated mail, not
JP's staff mail, which removes the domain-reputation risk that motivated using a third party at
all. It also removes an external account, removes Resend's 3,000/month ceiling (which was
user-facing — exhausting it breaks signup verification and password reset), and hands
SPF/DKIM/DMARC ownership to JP IT rather than us. Credentials were verified authenticating, and
a test message reached a Gmail inbox rather than spam, before the decision was taken. The
`EmailService` abstraction that made the original decision reversible is what made this cheap.

**Status**: ✅ **Live on UAT, verified 2026-08-17** — a real password-reset email reached an
external Gmail inbox, not spam, which also proved the relay delivers outside JP's own domain
(never previously tested). nodemailer replaced the Resend SDK.

The August placeholder warning is superseded: the later deployment record documents configured
SMTP secrets and actual production delivery (#88). Do not replace a live secret with a placeholder.
Secret configuration, historical delivery and the latest general owner confirmation are different
evidence; this consistency pass did not send a new diagnostic email.

⚠️ Two gaps found while verifying: there is **no resend-verification endpoint**, and password
reset does **not** mark an address verified — so a user who loses the verification email is
locked out with no self-service route (issue **#74**).

### 9. Meilisearch for search
**Decision**: Meilisearch for full-text search.
**Why**: simple, fast, good enough for the app's needs. Async indexing via events/jobs.
**Status**: ⚠️ **Running locally, not deployed.** Meilisearch *is* in `docker-compose.yml`. It is not deployed to Azure — search degrades gracefully, and entity search was moved off Meili onto Postgres trigram indexes so vratmitra lookup works without it.

### 10. Azure Blob Storage
**Decision**: ~~S3-compatible API~~ → **Azure Blob Storage** (D7), with managed identity instead of static keys. **Implemented** as #139 (2026-08-24). Strategy pattern: `azure-blob-storage.provider.ts` (cloud) / `s3-storage.provider.ts` (local MinIO). Azure Blob accounts: `veervratuatuploads`, `veervratproduploads`.
**Why**: app needs file uploads (images, documents). Provider-agnostic abstraction via a strategy interface.
**Status**: ✅ **Done.** Upload/read-back exercised on UAT 2026-08-24. The former direct-S3
content-overrides consumer now injects `StorageProvider`; conventions §28 records its UAT
read/write verification on 2026-09-05. No new production upload/editing drill is claimed.

### 11. Monorepo with pnpm + Turborepo
**Decision**: monorepo using pnpm workspaces and Turborepo.
**Why**: shared types, coordinated refactors, easier local dev for a solo dev / small team. Turborepo can be swapped for Nx later if needed.

### 12. Tailwind + shadcn/ui
**Decision**: Tailwind CSS for styling, shadcn/ui as the component library.
**Why**: utility-first CSS, no runtime overhead, shadcn components are copied into the project (not a dependency). No other CSS solutions or component libraries.

### 13. TanStack Query for client-side data
**Decision**: TanStack Query for all client-side server state. No global state library.
**Why**: handles caching, mutations, invalidation. React Context for shared UI state. No need for Zustand/Redux.

### 14. RBAC + relationship-scoped authorization
**Decision**: role-based access control (user, mentor, moderator, admin) plus relationship-based scoping.
**Why**: mentors see only assigned users, journey mentors see only their journey. Simple RBAC is not enough — access depends on relationships, not just role.
**Status**: ✅ **Built** — `common/permissions/has-permission.ts` + `PermissionGuard`, with auth-matrix tests (one positive + one negative per permission row).

### 15. Visibility model
**Decision**: user journeys are private by default. Users can change visibility. Main mentor sees everything, journey mentor sees specific journey. Moderators see only public content.
**Why**: app contains sensitive self-development data. Least-privilege by default.
**Status**: ✅ **Built** — enforced in the service layer via the permission function; profile visibility is a user-editable setting.

## Pending decisions

These are acknowledged but not yet decided in detail:

| Area | What's pending |
|---|---|
| ~~Background jobs~~ | ✅ Decided — @nestjs/schedule v1, BullMQ v2. See 10_Platform-Engineering-Standard.md |
| ~~Realtime~~ | ✅ Decided — NestJS Gateway + Socket.IO. See 10_Platform-Engineering-Standard.md |
| ~~Notifications~~ | ✅ Decided — in-app bell + email (JP IT's SMTP relay; was Resend, see D9). See spec/decisions/25_notifications.md |
| ~~Testing~~ | ✅ Decided — Vitest + supertest + Playwright. See 16_Testing-Strategy.md |
| ~~Observability~~ | **Sentry + Pino/stdout** supersede GlitchTip; Application Insights was subsequently dropped, not awaiting implementation. Error-delivery evidence and remaining alerting/uptime work are distinguished in [the observability standard](18_Observability-Standard.md). |
| ~~Security baseline~~ | ✅ CSRF (double-submit cookie), rate limiting, upload rules, brute force. See 10_Platform-Engineering-Standard.md + 14_Auth-Architecture-Decision.md (§15-16) |
| ~~Hosting~~ | ✅ Decided 2026-08 — **Azure**, Central India, single cloud + Terraform. Container Apps (not self-run Kubernetes), managed Postgres/Redis, zero VMs. See `../ops/azure-account-facts.md` and `21_Infrastructure-Conventions.md` |
| ~~Release process~~ | Policy revised 2026-10-10: single main trunk, recorded UAT acceptance, promotion without rebuild, production approval and recovery. See [governance policy](25_Git-and-Release-Governance.md); enforcement evidence lives in [rollout status](../ops/github-governance-status.md). |
| ~~CI/CD~~ | See [workflow definitions](../.github/workflows/README.md) for executable behavior and [governance rollout](../ops/github-governance-status.md) for required-check enforcement. Public-repository rulesets are available without a paid plan; do not reuse the earlier private-plan restriction as a reason to leave main unprotected. |
| ~~Object storage~~ | ✅ **Implemented** (#139, 2026-08-24) — Azure Blob with strategy pattern (`azure-blob-storage.provider.ts` / `s3-storage.provider.ts`). Exercised on UAT |
| ~~AI/recommendations~~ | ✅ Deferred to v2 explicitly. See spec/decisions/08_out-of-scope.md |
| ~~Visual design system~~ | ✅ Decided **and built** — tokens, typography, dark mode, motion, component language. `15_Design-System.md` (now merged with the former design-language doc) + `15a_UI-Consistency-Rules.md` |

## Convention docs

These define how code should be written. **See `00_INDEX.md` for the full documentation map.**

- `14_Auth-Architecture-Decision.md` — auth ownership, sessions, identity, OAuth, CSRF
- `11_Backend-Conventions.md` — layering, modules, naming, validation, errors, DB, logging
- `12_API-Conventions.md` — routes, methods, response shapes, pagination, rate limiting
- `13_Frontend-Conventions.md` — routing, components, data fetching, forms, styling

## Repo structure

See `AGENTS.md` for the full project layout and hard rules.
