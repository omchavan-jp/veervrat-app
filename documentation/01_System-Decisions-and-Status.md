# System Decisions & Status

This is the master reference for all technology and architecture decisions. Read this first to understand where the project stands.

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
| File storage | MinIO locally · **Azure Blob** in cloud | ⚠️ Decided but **not implemented** — code still speaks S3 (`@aws-sdk/client-s3`), which Azure Blob does not. Uploads degrade gracefully (chat images disabled). O15 / B-items |
| Hosting | **Azure** (Container Apps, Central India) | ✅ **UAT live and serving**; prod deployed 2026-08-16 but 🔴 **not usable** — prod web talks to UAT's api (O22) and no login path works (O23). See `../DEPLOYMENT.md` |
| CI / CD | GitHub Actions | ✅ Both — CI gates PRs; CD builds → migrates → deploys UAT on merge, prod by `prod-*` tag |
| Observability | Sentry (app errors) + Azure App Insights (platform) | ⚠️ Decided 2026-08 (**replaces GlitchTip**) but **not implemented** — Sentry SDK still reads `GLITCHTIP_DSN`, App Insights not wired at all. Backlog B13 |
| Rich text editor | Tiptap + JSON AST storage | ✅ Built |
| i18n | next-intl | ✅ Built — no URL routing, user preference, en + mr |
| WebSocket | NestJS Gateway + Socket.IO | ⚠️ Built with Redis adapter, but **has never run successfully in production** — the rewrite proxy blocks upgrades. Custom domains are now live (2026-08-17), so the remaining blocker is removing the proxy — `runtime-environment-config`, then O8 |
| Animation | Framer Motion | ✅ Built |
| Background jobs | @nestjs/schedule (v1), BullMQ path (v2) | ✅ Built — dormant-journeys + notifications crons |
| Auth | Custom in NestJS (cookie sessions, OAuth + credentials) | ✅ Built — see `openspec/specs/auth/spec.md`. 🔴 Google OAuth credentials are still `placeholder-not-configured` in **both** environments (O23). Credential signup now works on UAT (email delivers, B14); **prod still has no working login path** — its Key Vault holds a placeholder SMTP password |
| Email | **JP IT's SMTP relay** (prod) + console logging (dev) | ✅ **Delivering** — verified 2026-08-17, a real message reached an external Gmail inbox (not spam). nodemailer over `dhoomketu.in:587` STARTTLS. ⚠️ Prod's Key Vault still holds the placeholder password |
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
(never previously tested). nodemailer replaced the Resend SDK in B14.

⚠️ **Prod's Key Vault still holds the placeholder password** — set `smtp-password` there before
the next prod deploy, or prod will silently log mail to the console instead of sending.

⚠️ Two gaps found while verifying: there is **no resend-verification endpoint**, and password
reset does **not** mark an address verified — so a user who loses the verification email is
locked out with no self-service route (**B16**).

### 9. Meilisearch for search
**Decision**: Meilisearch for full-text search.
**Why**: simple, fast, good enough for the app's needs. Async indexing via events/jobs.
**Status**: ⚠️ **Running locally, not deployed.** Meilisearch *is* in `docker-compose.yml`. It is not deployed to Azure — search degrades gracefully, and entity search was moved off Meili onto Postgres trigram indexes so vratmitra lookup works without it.

### 10. S3-compatible object storage
**Decision**: ~~use S3-compatible API for file storage, provider TBD~~ → **superseded 2026-08 by D7**: Azure Blob Storage, with managed identity instead of static keys. ⚠️ The code still speaks the S3 API (`@aws-sdk/client-s3`), which Azure Blob does **not** — an SDK swap is required before Blob can be provisioned (O15). Uploads degrade gracefully meanwhile (chat images disabled). MinIO remains the local-dev provider.
**Why**: app needs file uploads (images, documents). S3 API is the standard abstraction — provider is pluggable.
**Status**: ⚠️ Provider **is** chosen (Azure Blob, D7). The SDK swap is what remains — see the note above and O15.

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
| ~~Observability~~ | ✅ Decided 2026-08 — **Sentry** (app errors) + **Azure App Insights** (platform) + Pino structured JSON. **Supersedes the earlier GlitchTip decision** (D8 in `../ops/PROJECT-STATUS.md`). Implementation still pending — see backlog B13. Standard: 18_Observability-Standard.md |
| ~~Security baseline~~ | ✅ CSRF (double-submit cookie), rate limiting, upload rules, brute force. See 10_Platform-Engineering-Standard.md + 14_Auth-Architecture-Decision.md (§15-16) |
| ~~Hosting~~ | ✅ Decided 2026-08 — **Azure**, Central India, single cloud + Terraform. Container Apps (not self-run Kubernetes), managed Postgres/Redis, zero VMs. See `../ops/azure-account-facts.md` and `21_Infrastructure-Conventions.md` |
| ~~Release process~~ | ✅ Decided 2026-08-16 (O6) — single `main` trunk, UAT auto-deploys on merge, prod ships by `prod-*` tag promoting the same image. See `../AGENTS.md` → Git conventions |
| ~~CI/CD~~ | ✅ **Both built** (O18) — CI gates PRs; CD does build → migrate → deploy with GitHub OIDC to Azure, no stored secrets. ⚠️ Merge is **not** blocked on green checks: branch protection is paywalled on this plan (B5) |
| Object storage | Provider decided (Azure Blob) but **not implemented** — app still uses the S3 API via `@aws-sdk/client-s3`; needs an `@azure/storage-blob` swap |
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
