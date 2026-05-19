# Backend Conventions — v1

## 1. Layering rules

Every request flows through exactly these layers:

```
Controller → Service → Repository → Prisma/DB
```

- **Controller**: handles HTTP — parses request, validates DTO, calls service, returns response. No business logic.
- **Service**: owns business logic, orchestrates repositories, enforces authorization rules, triggers events/jobs.
- **Repository**: data access only. Wraps Prisma calls. Returns domain-relevant data, not raw Prisma types where avoidable.
- **Prisma**: never imported or called outside of repositories.

### What goes where

| Concern | Layer |
|---|---|
| Request parsing, HTTP status codes | Controller |
| DTO validation | Controller (via pipes) |
| Business rules, workflows | Service |
| Authorization checks | Service (using guards for role checks, service-level for scoped access) |
| Database queries | Repository |
| Transactions | Repository (or service when spanning multiple repositories) |
| Event/job dispatching | Service |
| Logging | Any layer, but structured |

## 2. Module structure

Each domain gets its own NestJS module:

```
src/
  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      dto/
        login.dto.ts
        register.dto.ts
      guards/
        session-auth.guard.ts
    users/
      users.module.ts
      users.controller.ts
      users.service.ts
      users.repository.ts
      dto/
    journeys/
      ...
  common/
    decorators/
    exceptions/
    filters/
    interceptors/
    pipes/
    types/
  prisma/
    prisma.module.ts
    prisma.service.ts
  config/
    config.module.ts
    config.service.ts
  app.module.ts
  main.ts
```

### Rules
- one module per domain concept — don't combine unrelated domains
- a module may depend on another module's service (import the module), never on its repository directly
- `common/` holds cross-cutting concerns shared across modules
- `prisma/` is a global module — provides `PrismaService` to repositories

## 3. Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `auth.controller.ts`, `session-auth.guard.ts` |
| Classes | PascalCase | `AuthService`, `JourneyRepository` |
| Methods | camelCase | `findByUserId`, `createJourney` |
| DTOs | PascalCase + `Dto` suffix | `LoginDto`, `CreateJourneyDto` |
| Interfaces/types | PascalCase, no `I` prefix | `SessionPayload`, `PaginatedResult` |
| Constants | UPPER_SNAKE_CASE | `MAX_SESSIONS_PER_USER` |
| Database tables | snake_case, plural | `users`, `auth_accounts`, `journey_stages` |
| Database columns | snake_case | `created_at`, `user_id` |

## 4. Validation

Use **class-validator + class-transformer** for NestJS DTOs. This is the idiomatic NestJS approach.

```typescript
// dto/create-journey.dto.ts
export class CreateJourneyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### Rules
- every controller endpoint that accepts a body must have a DTO
- use `ValidationPipe` globally — never trust unvalidated input
- DTOs are for input validation only — do not reuse them as response types
- query/param validation also uses DTOs with appropriate decorators

## 5. Response shape

All API responses follow a consistent shape.

### Success
```json
{
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 142 }
}
```
- single item: `data` is the object
- list: `data` is an array, `meta` contains pagination info
- `meta` is omitted for non-paginated responses

### Error
```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Email is required",
  "details": [...]
}
```
- `error` is a machine-readable code (UPPER_SNAKE_CASE)
- `message` is human-readable
- `details` is optional, used for field-level validation errors

### Rules
- controllers return data; a global interceptor wraps it in `{ data }` shape
- never return raw Prisma objects from controllers — map to response types
- do not leak internal IDs, stack traces, or implementation details in error responses

## 6. Error handling

Use custom exception classes extending NestJS `HttpException`.

```typescript
// common/exceptions/app.exceptions.ts
export class EntityNotFoundException extends NotFoundException {
  constructor(entity: string, id: string) {
    super({ error: 'ENTITY_NOT_FOUND', message: `${entity} not found`, details: { id } });
  }
}
```

### Rules
- define domain-specific exceptions in `common/exceptions/`
- services throw exceptions — controllers do not catch them (let the global filter handle it)
- use a global exception filter to ensure all errors conform to the standard error shape
- never expose raw Prisma/database errors to the client
- log the full error server-side, return sanitized error to client

## 7. Pagination

Use **cursor-based pagination** as the default for list endpoints.

```
GET /api/journeys?cursor=abc123&pageSize=20
```

### Rules
- default page size: 20
- max page size: 100
- response includes `meta.nextCursor` (null if no more results)
- offset-based pagination allowed only for admin/internal dashboards where cursor doesn't make sense

## 8. Database conventions

### IDs
- use **UUIDs** as primary keys (`uuid` type in Postgres, generated by the database)
- expose UUIDs in APIs — never expose auto-increment IDs

### Standard fields
Every table has:
- `id` — UUID primary key
- `created_at` — timestamp, set on insert, never updated
- `updated_at` — timestamp, updated on every modification

### Soft deletes
- use soft deletes (`deleted_at` timestamp) for user-facing entities where recovery or audit is needed (users, journeys, etc.)
- repositories must filter out soft-deleted records by default
- hard delete only for transient/internal data

### Migrations
- all schema changes go through Prisma migrations — no manual DDL
- migration names must be descriptive: `add-journey-stages-table`, not `migration-001`
- migrations are reviewed as architecture changes — not rubber-stamped

### Enums
- use Postgres enums for small, stable value sets (roles, statuses)
- use lookup tables for value sets that may grow or need metadata

## 9. Authorization enforcement

Auth and authorization are separate concerns (see Auth Architecture Decision).

### Where checks happen
- **Guards** (NestJS): verify session validity and extract user identity. Applied globally or per-route.
- **Service layer**: enforce scoped/relationship-based access. E.g., "is this user the assigned mentor for this journey?"
- **Frontend**: role-based UI visibility is for UX only — never a security boundary.

### Rules
- every service method that accesses user-scoped data must receive the authenticated user and verify access
- never rely on "the frontend only shows this to admins" as a security measure
- admin/moderator actions must be audit-logged
- prefer explicit checks over implicit trust — if a service method can be called with any user ID, it must verify

## 10. Transactions

- use Prisma interactive transactions (`prisma.$transaction(async (tx) => { ... })`) for multi-step writes
- the repository or service that initiates the transaction owns the `tx` — pass it down to other repositories if needed
- do not nest transactions
- keep transactions short — no external API calls inside a transaction

## 11. Logging

Use **structured JSON logging**.

### Rules
- every request gets a correlation ID (set via middleware, propagated through the request lifecycle)
- log at appropriate levels: `error` for failures, `warn` for degraded states, `info` for key business events, `debug` for development
- **never log**: passwords, session tokens, private journey content, PII beyond user ID
- **always log**: auth failures, permission denials, admin/moderator actions, error details server-side

## 12. Configuration

- use NestJS `ConfigModule` with validation (e.g., Joi or class-validator schemas)
- all config values come from environment variables — no hardcoded secrets or URLs
- validate required config on app startup — fail fast if missing
- use `.env.example` as the documented reference for required variables

## 13. Cross-module communication

- modules import other modules and call their services — this is the standard NestJS approach
- do not import repositories from other modules
- if a service method is only meant for internal use by other modules (not exposed via API), name it clearly or separate the interface
- for async/decoupled communication (e.g., "journey completed, update recommendations"), use NestJS EventEmitter as a starting point — upgrade to a proper queue when needed
