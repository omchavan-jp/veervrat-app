# Veervrat App — Agent Context

## What this app is
A platform for self-reliance and personal growth built around the Veervrat framework. Users (vratarthi) explore their weaknesses via assessments and embark on journeys to work on specific aspects, with the goal of cultivating virtues ("sadgunachi upasana"). Vratmitras (mentors) guide users. Moderators and admins maintain the platform.

**Domain language:** `spec/CONTEXT.md` defines all canonical terms. Use them exactly — vratarthi not "user", weakness not "lacuna", sentence not "statement".

## Read in this order at session start
1. This file (CLAUDE.md)
2. `documentation/01_System-Decisions-and-Status.md` — where things stand
3. `spec/SPEC_INDEX.md` — every product decision that has been made

**Critical specs to load for any implementation work:**
- `spec/decisions/02_data-model.md` — entities and relationships (affects every feature)
- `spec/decisions/05_permissions.md` — permission matrix (affects every route)
- `documentation/10_Platform-Engineering-Standard.md` — approved libraries and constants (affects every file you write)
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
- `documentation/01_System-Decisions-and-Status.md` — master list of all tech decisions and status
- `documentation/02_Local-Development-Setup.md` — how to run the app locally
- `documentation/04_Implementation-Cautions-and-Principles.md` — **read before implementing any item.** Generalized principles, a feature Definition-of-Done, and a verification ladder distilled from a remediation pass on earlier AI-built code. Prevents the recurring failure classes (unverified "done", layer-only features, unmapped tokens, transport misconfig, partial i18n, missing negative tests).

### Convention docs
- `documentation/14_Auth-Architecture-Decision.md` — auth, sessions, OAuth, CSRF (double-submit cookie), rate limiting, brute force
- `documentation/11_Backend-Conventions.md` — layering, modules, naming, validation, errors, DB, logging
- `documentation/12_API-Conventions.md` — routes, methods, response shapes, pagination
- `documentation/13_Frontend-Conventions.md` — routing, components, data fetching, forms, styling
- `documentation/10_Platform-Engineering-Standard.md` — **approved library catalog**, security baseline, numeric constants. If a library is not here, do not use it without updating this doc first.
- `documentation/15_Design-System.md` — color tokens, typography, spacing, dark mode, component states
- `documentation/17_Audit-Schema.md` — audit event contract, mandatory events, `@Audited` decorator pattern
- `documentation/16_Testing-Strategy.md` — what to test, auth matrix tests, E2E flows
- `documentation/18_Observability-Standard.md` — structured logging schema, GlitchTip setup, alert thresholds
- `documentation/19_Email-Strategy.md` — Resend + React Email, transactional vs notification emails, template structure, bilingual strategy
- `documentation/21_Infrastructure-Conventions.md` — **read before touching `infra/terraform/`.** Naming rules, the DNS-zone rule, plan-before-apply discipline, import procedure, secrets/access model

## Hard rules — follow exactly

### General
- TypeScript strict mode everywhere
- no `any` — define proper types
- no `@ts-ignore` or `as any`
- no comments explaining what code does — only comment the WHY when non-obvious
- no new dependencies without updating `documentation/10_Platform-Engineering-Standard.md` first

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
- use `hasPermission(user, resource, action)` — never check `user.role === 'admin'` directly. (3-arg: ABAC context is carried inside the discriminated-union `resource`, not a separate 4th param.)
- permission matrix is in `spec/decisions/05_permissions.md` — implement exactly what is there

## Implementation SOP

### When to use OpenSpec
- **Feature already in `spec/decisions/`**: skip `/opsx:propose` — the product spec is done. Use `/opsx:propose` only to write the **implementation spec** (which files change, which routes, which tests). This is a thin translation layer, not a full re-spec.
- **Bug fix under ~20 lines**: fix directly, no spec needed
- **Systemic/cross-cutting change**: use OpenSpec for traceability

### Before every /opsx:propose — mandatory research phase
Do all of this before invoking the skill:
1. Read every document listed under **Refer:** for the item
2. Read the current state of every source file the change will touch
3. Check for new dependencies — if any, update `documentation/10_Platform-Engineering-Standard.md` approved library catalog first (hard rule from above)
4. Check `CLAUDE.md` hard rules for the affected layers (backend/frontend/API/database) — flag any conflict before proposing

### Flow for every feature
1. Research phase (see above) → `/opsx:propose` → write implementation spec (references relevant `spec/decisions/` files) → you review and approve
2. `/opsx:apply` → implement + write tests alongside code (never after) → run tests until they pass
3. `/code-review` → review findings → fix issues
4. `/opsx:archive` → only after tests pass and review is clean

### Non-negotiables in every apply
- Tests written alongside implementation — not after
- Auth matrix: one positive + one negative test per permission row for this feature
- `pnpm test` passes before apply is marked done
- No Prisma outside repository files — ever

## Git conventions

### Branching — single trunk (`main`), releases by tag

Settled 2026-08-16 (O6). Replaces the earlier `dev`/`main` two-branch model, which existed
when Railway auto-deployed `dev` to the only environment there was.

- **`main` is the trunk.** Everything merges here. **Never commit directly** — PR always.
- **`main` must always be releasable.** This is the one real cost of a single trunk: a
  release tag is only useful if `HEAD` is shippable. Keep PRs small and complete; anything
  half-finished stays on its branch or goes behind a flag.
- `feat/<name>` · `fix/<name>` · `refactor/<name>` · `chore/<name>` · `spec/<name>` —
  all branched from `main`.
- `dev` is **retired** — kept (branches are never deleted) but no longer merged into.

**Branches are not environments.** A branch says what code exists; a tag says what was
released. There is no `uat` branch and no `prod` branch — the same commit is promoted
through environments by tag, so what you tested is literally what ships.

### Environments and how code reaches them

| Environment | What runs there | Triggered by |
|---|---|---|
| **dev** | local `docker-compose` | nothing — it's your machine, no pipeline touches it |
| **UAT** | `veervrat-uat` on Azure | **automatic** on every merge to `main` |
| **prod** | `veervrat-prod` on Azure | **a `prod-*` tag** — the tag itself is the gate (see below) |

Note the name collision: the *environment* called "dev" (D10) is local docker-compose. It
has nothing to do with the old `dev` *branch*.

**On the prod gate:** GitHub's "required reviewers" protection rule needs a **paid plan on
private repos**, so there is no approval prompt. The deliberate act is cutting the tag —
nobody pushes a `prod-*` tag by accident, and self-approval would be a rubber stamp for a
single maintainer. Revisit when a second maintainer joins or the repo moves to an org.

### Release tags
- Format `prod-YYYY-MM-DD`, suffixed `-2`, `-3` for multiple releases in a day.
- **Deliberately not semver** — semver signals a public API contract this app doesn't have.
- The tag is a human-readable bookmark. Real traceability is the **container image tagged
  with the git SHA**.
- **Promote, never rebuild.** The prod deploy ships the *same image* UAT already exercised.
  Rebuilding from the same commit usually produces identical bits — but not guaranteed
  (dependency resolution drifts), and then you'd ship something nobody tested.

### Hotfix
1. Branch from the **last `prod-*` tag** (not necessarily `main` — `main` may contain
   unreleased work).
2. Fix, PR, merge to `main`.
3. Tag and deploy.
4. **Confirm the fix is on `main`.** This is the step everyone forgets; skip it and the
   next release silently reverts the hotfix.

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
- Squash merge feature branches into `main` (clean history)
- Never merge `main` into a feature branch mid-work — rebase instead
- Feature branches are **kept** after merge, never deleted

**Squash and keep-the-branch are a pair, not two independent preferences.** Squashing puts
one commit per PR on `main` — readable history, and a revert is a single commit, which
matters now that tags mark releases. The cost is that the branch becomes the *only* place
the granular commits survive, so deleting it would genuinely lose that history. (The
coherent alternative is normal-merge + delete, which keeps every `wip`/`fix typo` commit in
`main`'s history instead. We chose the other trade.) If the branch list gets noisy, prune
old *merged* branches deliberately — don't switch merge strategy.

### Database migrations
- **Never auto-migrate any deployed environment.** Migrations run as a deliberate,
  separately-triggered step, before the app image that needs them is deployed.
- They run as a one-off job **inside Azure**, using the same container image as the app —
  not from a laptop. Azure Postgres only accepts connections from Azure services, and
  running from a local machine also risks a Prisma version mismatch with production.
- Order is always: **build image → run migration job → deploy app.** Reversed, the app
  queries columns that don't exist yet.
- Migrations are forward-only. A bad one is corrected by a new migration, never by
  `migrate reset` against a deployed database.
- Full procedure: `DEPLOYMENT.md`.

## When asking the user a question

Never present a bare question or a bare recommendation. Every time you ask the user to
decide something, include:

1. **The options you actually considered** — including the ones you rejected.
2. **Which way you lean**, stated plainly. Not "it depends" — pick one.
3. **Why that one, and specifically why not each alternative.** The rejected options are
   where the reasoning lives; omitting them hides whether you thought about them at all.
4. **What would change your mind** — the fact or constraint that would flip your
   recommendation. This is what lets the user answer with information rather than a coin flip.

A recommendation without its alternatives is indistinguishable from a guess, and forces the
user to re-derive the analysis you already did.

## Editing files — use the editing tools, not shell text manipulation

**Use `Edit` for targeted changes and `Write` for full rewrites.** Reserve shell (`sed`,
`perl -pi`, python `str.replace`) for genuinely append-only operations where nothing existing
can be corrupted.

The reason is failure behaviour, not preference:

- `Edit` **fails loudly** if `old_string` does not match exactly, so a stale assumption stops
  you immediately.
- `sed`/`python .replace()` **fail silently** — the command exits 0 having changed nothing.
  You only notice if you remember to grep afterwards, which means correctness depends on
  remembering to check.
- Regex-based edits can also *corrupt* rather than no-op. This has already happened here: a
  `perl -pi` substitution produced `...url)));` — an unbalanced paren that broke the file and
  had to be spotted and repaired by hand.

Batching several edits into one shell call is not a good enough reason to give up loud
failure on a file you cannot afford to silently mangle.

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
- Full strategy: `documentation/16_Testing-Strategy.md`
- Auth matrix tests are the highest-priority category — one positive + one negative per permission row
- Tests are not set up yet — do not assume test infrastructure exists until configured
