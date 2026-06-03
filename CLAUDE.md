# Veervrat App — Agent Context

## What this app is
A platform for self-reliance and personal growth built around the Veervrat framework. Users (vratarthi) explore their weaknesses via assessments and embark on journeys to work on specific aspects, with the goal of cultivating virtues ("sadgunachi upasana"). Vratmitras (mentors) guide users. Moderators and admins maintain the platform.

**Domain language:** `spec/CONTEXT.md` defines all canonical terms. Use them exactly — vratarthi not "user", weakness not "lacuna", sentence not "statement".

## Read in this order at session start
1. This file (CLAUDE.md)
2. `documentation/System Decisions & Status.md` — where things stand
3. `spec/SPEC_INDEX.md` — every product decision that has been made

**Critical specs to load for any implementation work:**
- `spec/decisions/02_data-model.md` — entities and relationships (affects every feature)
- `spec/decisions/05_permissions.md` — permission matrix (affects every route)
- `documentation/Platform-Engineering-Standard.md` — approved libraries and constants (affects every file you write)
- `spec/decisions/27_screen-specs.md` — screen-level design for all 74 screens

When unsure about a product decision, read `spec/decisions/` before guessing. If still unclear, stop and ask.

## Tech stack
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Search**: Meilisearch
- **Storage**: MinIO (S3-compatible)
- **WebSocket**: NestJS Gateway + Socket.IO
- **i18n**: next-intl (no URL-based locale routing)
- **Rich text**: Tiptap (JSON AST storage in jsonb columns)
- **Animation**: Framer Motion
- **Monorepo**: pnpm workspaces + Turborepo
- **API style**: REST, cookie-based sessions, JSON responses

## Project layout
```
veervrat-app/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # App Router — route groups by role
│   │   │   ├── (public)/       # login, signup, forgot-password, reset-password
│   │   │   ├── (app)/          # VA dashboard, journeys, study flow, actions
│   │   │   ├── (vratmitra)/    # VM views — my-vratarthis, vm-actions
│   │   │   ├── (moderation)/   # moderation dashboard
│   │   │   └── (admin)/        # admin dashboard, users, platform
│   │   ├── messages/           # i18n message files (en.json, mr.json)
│   │   ├── components/         # ui/ (shadcn), layout/, shared/
│   │   ├── lib/
│   │   │   ├── api/            # typed API client + domain functions + query keys
│   │   │   ├── providers.tsx   # TanStack Query + i18n providers
│   │   │   ├── query-client.ts
│   │   │   └── utils.ts        # cn() helper
│   │   └── hooks/
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── modules/        # domain modules (auth/, users/, journeys/, etc.)
│       │   │   └── <module>/
│       │   │       ├── <module>.module.ts
│       │   │       ├── <module>.controller.ts
│       │   │       ├── <module>.service.ts
│       │   │       ├── <module>.repository.ts
│       │   │       └── dto/
│       │   ├── common/         # decorators, exceptions, filters, interceptors, pipes, types
│       │   │   └── permissions/ # hasPermission() function and permission guard
│       │   ├── prisma/         # PrismaModule + PrismaService (global)
│       │   └── config/         # AppConfigModule
│       └── prisma/
│           └── schema.prisma
├── packages/
│   └── types/                  # shared TypeScript types (@veervrat/types)
├── spec/                       # product spec (decisions, ADRs, screen specs, audit)
├── documentation/              # engineering decisions and standards
├── openspec/                   # spec-driven workflow (active changes)
└── .claude/                    # skills and commands
```

## Documentation — READ THESE

### Start here
- `documentation/System Decisions & Status.md` — master list of all tech decisions and status
- `documentation/Local Development Setup.md` — how to run the app locally

### Convention docs
- `documentation/Auth Architecture Decision - v1.md` — auth, sessions, OAuth, CSRF (double-submit cookie), rate limiting, brute force
- `documentation/Backend Conventions - v1.md` — layering, modules, naming, validation, errors, DB, logging
- `documentation/API Conventions - v1.md` — routes, methods, response shapes, pagination
- `documentation/Frontend Conventions - v1.md` — routing, components, data fetching, forms, styling
- `documentation/Platform-Engineering-Standard.md` — **approved library catalog**, security baseline, numeric constants. If a library is not here, do not use it without updating this doc first.
- `documentation/Design-System.md` — color tokens, typography, spacing, dark mode, component states
- `documentation/Audit-Schema.md` — audit event contract, mandatory events, `@Audited` decorator pattern
- `documentation/Testing-Strategy.md` — what to test, auth matrix tests, E2E flows
- `documentation/Observability-Standard.md` — structured logging schema, GlitchTip setup, alert thresholds
- `documentation/Email-Strategy.md` — Resend + React Email, transactional vs notification emails, template structure, bilingual strategy

## Hard rules — follow exactly

### General
- TypeScript strict mode everywhere
- no `any` — define proper types
- no `@ts-ignore` or `as any`
- no comments explaining what code does — only comment the WHY when non-obvious
- no new dependencies without updating `documentation/Platform-Engineering-Standard.md` first

### Backend
- **controller → service → repository → Prisma** — never skip layers
- Prisma is ONLY used inside repository files — never in services, never in controllers
- all input validated via class-validator DTOs
- all errors use custom exceptions from `common/exceptions/`
- auth checks: NestJS guard for identity, service layer for scoped access (ABAC)
- frontend is NEVER a security boundary
- all admin/moderator actions are audit-logged via `@Audited()` decorator
- no business logic in controllers
- cross-module: import services, never import repositories from other modules

### Frontend
- server components by default — `'use client'` only when needed for interactivity
- TanStack Query for all client-side server state
- no Zustand, Redux, or other global state libraries — Context for shared UI state
- all API calls go through `lib/api/client.ts` — never raw fetch in components
- React Hook Form + Zod for forms
- Tailwind utility classes only — no CSS modules, styled-components
- shadcn/ui components only — no MUI, Chakra, Ant Design
- lucide-react for icons — no other icon libraries
- next-intl for all UI strings — no hardcoded EN/MR text in components

### API
- all routes prefixed with `/api/v1/`
- response shape: `{ data }` for success, `{ statusCode, error, message }` for errors
- PATCH for updates, never PUT
- cursor-based pagination by default
- camelCase in JSON, snake_case in database

### Database
- UUIDs for all primary keys
- every table has `id`, `created_at`, `updated_at`
- soft deletes (`deleted_at`) for user-facing entities
- all schema changes via Prisma migrations with descriptive names
- no manual DDL
- **never run migrations against production** — migrations run manually after review

### Permissions
- every protected route must enforce two layers: guard (who are you) + service check (are you allowed on this specific resource)
- use `hasPermission(user, resource, action, context)` — never check `user.role === 'admin'` directly
- permission matrix is in `spec/decisions/05_permissions.md` — implement exactly what is there

## Implementation SOP

### When to use OpenSpec
- **Feature already in `spec/decisions/`**: skip `/opsx:propose` — the product spec is done. Use `/opsx:propose` only to write the **implementation spec** (which files change, which routes, which tests). This is a thin translation layer, not a full re-spec.
- **Bug fix under ~20 lines**: fix directly, no spec needed
- **Systemic/cross-cutting change**: use OpenSpec for traceability

### Flow for every feature
1. `/opsx:propose` → write implementation spec (references relevant `spec/decisions/` files) → you review and approve
2. `/opsx:apply` → implement + write tests alongside code (never after) → run tests until they pass
3. `/code-review` → review findings → fix issues
4. `/opsx:archive` → only after tests pass and review is clean

### Non-negotiables in every apply
- Tests written alongside implementation — not after
- Auth matrix: one positive + one negative test per permission row for this feature
- `pnpm test` passes before apply is marked done
- No Prisma outside repository files — ever

## Git conventions

### Branching
- `dev` — **working integration branch**. All feature branches merge here. Never commit directly to dev — PR always.
- `main` — production-stable only. Merges from dev after release validation.
- `feat/<name>` — new features, branched from dev
- `fix/<name>` — bug fixes, branched from dev
- `refactor/<name>` — refactoring without behaviour change
- `chore/<name>` — tooling, config, deps
- `spec/<name>` — spec and documentation work (e.g. `spec/discovery` — now merged into dev)
- **No direct commits to dev or main** — PR always

### Commit messages (conventional commits)
- `feat: add journey status overview endpoint`
- `fix: session cookie not cleared on logout`
- `chore: add Redis to docker-compose`
- `test: auth matrix tests for journey permissions`
- `docs: update Platform Engineering Standard with Tiptap`
- `db: add resolution_checkin migration`
- One logical change per commit — do not bundle unrelated changes
- Migrations get their own commit: `db: add journey_weakness join table`

### Merging philosophy
- Squash merge feature branches into dev (clean history)
- Never merge dev into a feature branch mid-work — rebase instead
- dev → main only for production releases

### Before starting implementation
- `spec/discovery` is merged to `dev` ✅
- Create `chore/pre-impl-setup` branch off `dev` for infrastructure setup (docker-compose, env, schema)
- Feature branches created from `dev` after setup is merged

## Session discipline
- One task per session — don't try to do everything
- Load only relevant context (backend: read api/ files; frontend: read web/ files)
- Read the relevant convention doc and spec decision file before starting work in any area
- When uncertain about a decision: read `spec/decisions/` first. If still unclear — stop and ask, do not guess.
- Never invent behaviour not described in `spec/decisions/` or `documentation/` — flag it instead

## What NOT to read (ignore entirely)
- `node_modules/`, `.next/`, `dist/`, `.turbo/`
- `*.lock`, `*.tsbuildinfo`
- `.DS_Store`, `.env` files (read `.env.example` instead)
- `openspec/changes/archive/` (historical)
- `prototypes/` — reference for UX only, zero code to reuse

## Testing
- Framework: Vitest + supertest (backend), Vitest + React Testing Library (frontend), Playwright (E2E)
- Full strategy: `documentation/Testing-Strategy.md`
- Auth matrix tests are the highest-priority category — one positive + one negative per permission row
- Tests are not set up yet — do not assume test infrastructure exists until configured
