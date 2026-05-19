# Veervrat App — Agent Context

## What this app is
A platform for self-reliance and personal growth built around the Veervrat framework. Users (vratarthi) explore their weaknesses via assessments and embark on journeys to work on specific aspects. Mentors (vratmitra) guide users. Moderators and admins maintain the platform.

## Tech stack
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Search**: Meilisearch (when added)
- **Monorepo**: pnpm workspaces + Turborepo
- **API style**: REST, cookie-based sessions, JSON responses

## Project layout
```
veervrat-app/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # App Router — route groups by role
│   │   │   ├── (public)/       # login, register, forgot-password
│   │   │   ├── (app)/          # user dashboard, journeys, assessments
│   │   │   ├── (mentor)/       # mentor dashboard, mentees
│   │   │   ├── (moderation)/   # moderation dashboard, reports
│   │   │   └── (admin)/        # admin dashboard, users, platform
│   │   ├── components/         # ui/ (shadcn), layout/, shared/
│   │   ├── lib/
│   │   │   ├── api/            # typed API client + domain functions + query keys
│   │   │   ├── providers.tsx   # TanStack Query provider
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
│       │   ├── prisma/         # PrismaModule + PrismaService (global)
│       │   └── config/         # AppConfigModule
│       └── prisma/
│           └── schema.prisma
├── packages/
│   └── types/                  # shared TypeScript types (@veervrat/types)
├── documentation/              # architecture decision docs (see below)
├── openspec/                   # spec-driven workflow
│   ├── specs/                  # source of truth for system capabilities
│   └── changes/                # active change proposals
└── .claude/                    # skills and commands
```

## Documentation — READ THESE

### Start here
- `documentation/System Decisions & Status.md` — **master list** of all tech decisions, their status, and what's pending. Read this first to understand where the project stands.
- `documentation/Local Development Setup.md` — how to set up and run the local dev environment

### Convention docs (how code should be written)
- `documentation/Auth Architecture Decision - v1.md` — auth ownership, session model, identity, OAuth, account linking, CSRF
- `documentation/Backend Conventions - v1.md` — layering (Controller → Service → Repository → Prisma), module structure, naming, validation, error handling, pagination, DB conventions, transactions, logging
- `documentation/API Conventions - v1.md` — REST routes, HTTP methods, response/error shapes, filtering, sorting, idempotency, rate limiting
- `documentation/Frontend Conventions - v1.md` — routing, server/client components, data fetching (TanStack Query), forms (React Hook Form + Zod), styling (Tailwind only), API client, component conventions

## Hard rules — follow exactly

### General
- TypeScript strict mode everywhere
- no `any` — define proper types
- no `@ts-ignore` or `as any`
- no comments explaining what code does — only comment the WHY when non-obvious
- no new dependencies without justification

### Backend
- **controller → service → repository → Prisma** — never skip layers
- Prisma is ONLY used inside repository files
- all input validated via class-validator DTOs
- all errors use custom exceptions from `common/exceptions/`
- auth checks happen in guards (identity) and services (scoped access)
- frontend is NEVER a security boundary
- all admin/moderator actions are audit-logged
- no business logic in controllers
- cross-module communication: import modules and call services, never import repositories from other modules

### Frontend
- server components by default — `'use client'` only when needed for interactivity
- TanStack Query for all client-side server state
- no Zustand, Redux, or other global state libraries — use Context for shared UI state
- all API calls go through `lib/api/client.ts` — never raw fetch in components
- React Hook Form + Zod for forms
- Tailwind utility classes only — no CSS modules, styled-components, or other CSS solutions
- shadcn/ui components only — no MUI, Chakra, Ant Design
- lucide-react for icons — no other icon libraries

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

## OpenSpec workflow — MANDATORY for non-trivial changes
- **New feature / modify feature**: `/opsx:propose` → fill spec → `/opsx:apply` → `/opsx:archive`
- **Bug fix under ~20 lines**: fix directly, no spec needed
- **Systemic bug or cross-cutting change**: use OpenSpec for traceability
- Specs live in `openspec/specs/` (source of truth)
- Active changes live in `openspec/changes/`

## Git conventions
- **Branch naming**: `feat/<name>`, `fix/<name>`, `refactor/<name>`, `chore/<name>`
- **Commit messages**: conventional commits — `feat: add auth module`, `fix: session expiry handling`
- **One logical change per commit** — don't bundle unrelated changes
- **PR before merge** — no direct commits to main
- **Migrations get their own commit** with clear description

## Session discipline
- one task per session — don't try to do everything
- load only relevant context (backend tasks: read backend files; frontend tasks: read frontend files)
- read the relevant convention doc before starting work in that area
- if unsure about architecture, use `/opsx:explore` to think through it first

## What NOT to read (ignore entirely)
- `node_modules/`, `.next/`, `dist/`, `.turbo/`
- `*.lock`, `*.tsbuildinfo`
- `.DS_Store`, `.env` files (read `.env.example` instead)
- `openspec/changes/archive/` (historical, not current state)

## Testing (not set up yet)
When tests are added:
- **Frontend**: Vitest + React Testing Library
- **Backend**: Vitest + supertest for NestJS
- **E2E**: Playwright for critical flows
- Do NOT assume any test setup exists until explicitly configured
