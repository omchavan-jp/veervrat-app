# System Decisions & Status

This is the master reference for all technology and architecture decisions. Read this first to understand where the project stands.

## Stack overview

| Layer | Choice | Status |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Scaffolded |
| Backend | NestJS + TypeScript | Scaffolded |
| Database | PostgreSQL | Scaffolded (docker-compose) |
| ORM | Prisma | Scaffolded |
| Search | Meilisearch | Decided, not set up |
| File storage | S3-compatible (provider TBD) | Decided, not set up |
| Auth | Custom in NestJS (cookie sessions, OAuth + credentials) | Decided, not built |
| Email | Resend (prod) + console logging (dev) | Decided, not built |
| Monorepo | pnpm workspaces + Turborepo | Scaffolded |
| UI | Tailwind CSS + shadcn/ui | Scaffolded |
| API style | REST | Scaffolded |

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
**Details**: see `Auth Architecture Decision - v1.md`

### 6. Auth owned by NestJS
**Decision**: NestJS is the source of truth for authentication. Next.js is only the UI layer.
**Why**: centralizes auth logic, avoids framework lock-in, clearer security boundary. No Auth.js or Clerk — custom implementation.
**Details**: see `Auth Architecture Decision - v1.md`

### 7. Google OAuth + email/password
**Decision**: support Google OAuth and email/password login initially.
**Why**: covers the two most common auth methods. Architecture supports adding more OAuth providers later.
**Account linking**: no auto-link on email match — requires explicit confirmation.

### 8. Email via Resend + console logging for dev
**Decision**: Resend as the email provider for production, console logging for local development.
**Why**: Resend has excellent DX, generous free tier (100/day), clean Node SDK. Console logging means zero external dependencies for local dev. Email service abstracted behind an interface so provider can be swapped later.
**Status**: pending implementation. Need to create Resend account and API key when ready for production email.

### 9. Meilisearch for search
**Decision**: Meilisearch for full-text search.
**Why**: simple, fast, good enough for the app's needs. Async indexing via events/jobs.
**Status**: decided, not set up yet. Will add to docker-compose when needed.

### 10. S3-compatible object storage
**Decision**: use S3-compatible API for file storage. Provider TBD (could be AWS S3, Cloudflare R2, MinIO, or SeaweedFS).
**Why**: app needs file uploads (images, documents). S3 API is the standard abstraction — provider is pluggable.
**Status**: decided, provider not chosen, not set up.

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
**Status**: designed conceptually, not implemented.

### 15. Visibility model
**Decision**: user journeys are private by default. Users can change visibility. Main mentor sees everything, journey mentor sees specific journey. Moderators see only public content.
**Why**: app contains sensitive self-development data. Least-privilege by default.
**Status**: designed conceptually, not implemented.

## Pending decisions

These are acknowledged but not yet decided in detail:

| Area | What's pending |
|---|---|
| Background jobs | Framework choice (BullMQ vs Trigger.dev), what tasks are async |
| Realtime | Transport (WebSockets/SSE), what needs realtime |
| Notifications | In-app model, email notifications, delivery architecture |
| Testing | Test framework setup, coverage expectations, critical path tests |
| Observability | Error tracking tool, structured logging format, alerting |
| Security baseline | Rate limiting implementation, upload validation rules, secret rotation |
| CI/CD | Pipeline setup, required checks, preview environments |
| Deployment | Hosting provider, CDN, scaling strategy |
| AI/recommendations | Rule-based vs LLM, where AI logic lives, privacy constraints |

## Convention docs

These define how code should be written:

- `Auth Architecture Decision - v1.md` — auth ownership, sessions, identity, OAuth, CSRF
- `Backend Conventions - v1.md` — layering, modules, naming, validation, errors, DB, logging
- `API Conventions - v1.md` — routes, methods, response shapes, pagination, rate limiting
- `Frontend Conventions - v1.md` — routing, components, data fetching, forms, styling

## Repo structure

See `CLAUDE.md` for the full project layout and hard rules.
