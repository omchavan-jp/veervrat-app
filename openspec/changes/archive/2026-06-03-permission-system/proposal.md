## Why

Every protected backend route needs authorization, but there is no `hasPermission` function or `PermissionGuard` yet. Without this layer, every future feature would scatter ad-hoc role checks across controllers and services — exactly the anti-pattern `spec/decisions/05_permissions.md` prohibits. This must exist before any feature module is built.

## What Changes

- Introduce `hasPermission(user, resource, action, context)` — a single, centrally-tested function implementing the RBAC+ABAC hybrid described in `spec/decisions/05_permissions.md`
- Introduce `PermissionGuard` — a NestJS guard that reads a `@RequirePermission()` decorator and calls `hasPermission` with the resolved resource from the request
- Introduce `@RequirePermission()` — a parameter decorator that annotates route handlers with the required permission and resource resolver
- Implement all Layer 1 (VA/VM participant) and Layer 2 (admin/moderator platform) permission rows from `spec/decisions/05_permissions.md`
- Write auth matrix tests: one positive + one negative per permission row (unit tests of `hasPermission` + API tests for the guard)

## Capabilities

### New Capabilities

- `permission-system`: The `hasPermission` function, `PermissionGuard`, `@RequirePermission()` decorator, supporting context types, and full auth matrix unit test suite covering all 45+ permission rows from `spec/decisions/05_permissions.md`

### Modified Capabilities

*(none — no existing capability specs are changing)*

## Impact

- **New files**: `apps/api/src/common/permissions/has-permission.ts`, `apps/api/src/common/permissions/permission.guard.ts`, `apps/api/src/common/permissions/require-permission.decorator.ts`, `apps/api/src/common/permissions/types.ts`, `apps/api/src/common/permissions/index.ts`, `apps/api/src/common/permissions/has-permission.spec.ts`, `apps/api/src/common/permissions/permission.guard.integration.spec.ts`
- **No schema changes** — no new Prisma models or migrations required
- **No new dependencies** — uses existing NestJS, `@prisma/client` types, and Vitest
- All future feature modules will import from `common/permissions/` — this is a foundational cross-cutting module
