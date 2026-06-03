## Context

The backend already has `SessionGuard` (identity — "who are you?") and `SessionUser` (user + roles array). What is missing is the authorization layer — "are you allowed to do this to this resource?".

`spec/decisions/05_permissions.md` defines ~45 permission rows across two layers:
- **Layer 1** — participant actions: VA and VM acting within their own journeys
- **Layer 2** — platform actions: admin and moderator acting on any data

The key constraint: ABAC checks require the **full resource object** (e.g., a `Journey` with `vratarthiId`, a `JourneyVmAssignment` with `vmId` and `state`) — not just an ID. The guard must resolve the resource before checking permission.

Current file state: `common/permissions/` directory does not exist. `AccessDeniedException` already exists in `common/exceptions/app.exceptions.ts`. No new Prisma models are needed.

## Goals / Non-Goals

**Goals:**
- Single `hasPermission(user, resource, action, context)` function — all permission logic lives here, nowhere else
- `PermissionGuard` — NestJS guard wiring `hasPermission` into the request lifecycle
- `@RequirePermission(action, resolver)` decorator — annotates route handlers; resolver extracts the resource from the request
- Full coverage of every permission row in Layer 1 + Layer 2 tables
- Auth matrix unit tests: one positive + one negative per row (pure unit, no DB)
- Auth matrix API tests: guard integration tests for the guard itself (with a real test app)

**Non-Goals:**
- Dynamic DB-backed permission configuration (out of scope v1 — `spec/decisions/05_permissions.md`)
- Frontend role-based UI visibility (frontend conventions handle that separately)
- Permission caching/memoization (not needed at v1 scale)

## Decisions

### Decision 1: `hasPermission` is a pure function, not a NestJS service

**Choice:** `hasPermission` is exported as a plain TypeScript function. It receives `(user: SessionUser, resource: PermissionResource, action: PermissionAction, context: PermissionContext)` and returns `boolean`.

**Why:** A pure function is trivially unit-testable — no DI container, no mocking. The function has no I/O; all relationship data must already be loaded (ABAC rule: pass full objects, not IDs). A NestJS `@Injectable()` service would add DI overhead without benefit here.

**Alternative considered:** A class-based `PermissionsService`. Rejected — adds DI complexity with no upside since the function is stateless.

---

### Decision 2: Resource types are discriminated unions

**Choice:** `PermissionResource` is a TypeScript discriminated union:
```ts
type PermissionResource =
  | { type: 'journey'; journey: Journey & { vmAssignments: JourneyVmAssignment[]; globalVmRelationship: VmRelationship | null } }
  | { type: 'erc'; journey: Journey & ...; erc: JourneyExposure | JourneyResolution | JourneyChallenge }
  | { type: 'experience_log'; log: ExperienceLog }
  | { type: 'blog'; blog: Blog }
  | { type: 'blog_comment'; blog: Blog; comment: BlogComment }
  | { type: 'test_attempt'; attempt: TestAttempt }
  | { type: 'invitation'; invitation: Invitation }
  | { type: 'vm_relationship'; relationship: VmRelationship }
  | { type: 'platform' }  // for Layer 2 admin/moderator actions
```

**Why:** Discriminated unions give TypeScript exhaustiveness checking on the `type` field. Each permission action logically maps to one resource type. The resolver in `@RequirePermission` can return the correct union variant. This makes `hasPermission` switch cases type-safe without `as any`.

**Alternative considered:** A generic `Record<string, unknown>` resource bag. Rejected — loses type safety, makes the permission function a runtime duck-type minefield.

---

### Decision 3: `@RequirePermission` decorator takes a resolver function

**Choice:**
```ts
@RequirePermission('journey.view', async (req, app) => {
  const journey = await app.get(JourneysRepository).findById(req.params.id);
  return { type: 'journey', journey };
})
```
The decorator stores `[action, resolver]` in Reflector metadata. `PermissionGuard` reads them, calls the resolver with `(request, moduleRef)`, and passes the result to `hasPermission`.

**Why:** Resources live in the DB. The guard needs to load them before checking. A resolver function keeps the loading logic co-located with the route, not scattered in the guard. `ModuleRef` gives the resolver access to any registered NestJS service without coupling the guard to every module.

**Alternative considered:** Passing only the action, and having the guard do generic resource loading via a lookup map. Rejected — the guard can't generically load every resource type without becoming tightly coupled to all domain modules.

---

### Decision 4: VM scoping via explicit relationship objects

**Choice:** For VM checks, the caller loads `journey.vmAssignments` (array of `JourneyVmAssignment` with `vmId` and `state = ACTIVE`) and the user's `globalVmRelationship` (a `VmRelationship` with `state = ACTIVE`). `hasPermission` checks:
- Global VM: `context.globalVmRelationship?.vmId === user.id && state === ACTIVE`
- Journey VM: `journey.vmAssignments.some(a => a.vmId === user.id && a.state === ACTIVE)`

**Why:** `spec/decisions/05_permissions.md` requires relationship-scoped ABAC. This must work without additional DB queries inside `hasPermission` — load eagerly at the call site (service layer).

---

### Decision 5: Auth matrix unit tests are pure, no DB

**Choice:** `has-permission.spec.ts` tests `hasPermission` directly with fabricated `SessionUser`, fabricated resource objects, and fabricated relationship arrays. No Prisma, no supertest.

**Why:** The function is pure — all inputs are in-memory. Unit tests run instantly and cover all 45+ permission rows. A separate integration test (`permission.guard.integration.spec.ts`) covers the guard itself (that it returns 401 without session, 403 without permission) against the real test app with a minimal fixture endpoint.

## Risks / Trade-offs

- **Risk: Callers forget to load relationship data** → Mitigation: TypeScript types enforce that `journey.vmAssignments` and `globalVmRelationship` are present on the resource object. If the caller omits them, it's a compile error, not a silent `false`.

- **Risk: Permission table grows and `hasPermission` becomes a 500-line switch** → Mitigation: The function is structured as `checkLayerOne(user, resource, action)` and `checkLayerTwo(user, resource, action)` sub-functions, each organized by resource type. This keeps switch cases short and navigable.

- **Risk: Resolver errors bubble as 500s** → Mitigation: Resolvers that throw (e.g., resource not found) should throw `EntityNotFoundException` — the global exception filter converts this to 404, not 500. The guard does not catch resolver errors.
