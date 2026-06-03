## 1. Types and permission action definitions

- [x] 1.1 Create `apps/api/src/common/permissions/types.ts` — define `PermissionAction` as a union of all action strings from Layer 1 + Layer 2 (`journey.create`, `journey.view`, `erc.select`, `admin.view_any_journey`, etc.), `PermissionResource` as a discriminated union of all resource shapes, and `PermissionContext` for supplementary relationship data (global VM relationship)
- [x] 1.2 Verify all action strings are exhaustively listed (count against `spec/decisions/05_permissions.md` tables — Layer 1 has ~34 rows, Layer 2 has ~13 rows)

## 2. hasPermission function — Layer 1 (participant actions)

- [x] 2.1 Create `apps/api/src/common/permissions/has-permission.ts` with the function signature `hasPermission(user: SessionUser, resource: PermissionResource, action: PermissionAction): boolean`
- [x] 2.2 Implement `checkLayerOne` sub-function covering journey actions: `journey.create`, `journey.view` (own + journey VM + global VM), `journey.pause`, `journey.resume`, `journey.complete` (VA submit + VM approve)
- [x] 2.3 Implement ERC actions: `erc.select`, `erc.suggest`, `erc.approve_closure` (self-approve when no VM; VM approve when assigned), `erc.deactivate`, `erc.remove`
- [x] 2.4 Implement custom ERC actions: `custom_erc.create`, `custom_erc.submit_for_review`, `custom_erc.edit`, `custom_erc.delete` (own pre-submission only)
- [x] 2.5 Implement test actions: `test.take` (VA only), `test.view_results` (own + global VM + journey VM scoped)
- [x] 2.6 Implement chat actions: `chat.view`, `chat.send` (VA own + assigned VM)
- [x] 2.7 Implement experience log actions: `experience_log.create`, `experience_log.view`, `experience_log.edit`, `experience_log.delete`
- [x] 2.8 Implement social actions: `blog.create`, `blog.edit`, `blog.delete`, `comment.create`, `comment.delete`, `comment.hide`, `comment.report`, `follow.create`, `follow.remove`
- [x] 2.9 Implement invitation actions: `vm_invitation.send`, `vm_invitation.accept`, `vm_invitation.cancel`, `vm_invitation.decline`, `vm_relationship.withdraw`
- [x] 2.10 Implement remaining Layer 1 actions: `weakness.attach`, `challenge.configure_threshold`, `global_vm.view_va_guidance`

## 3. hasPermission function — Layer 2 (platform actions)

- [x] 3.1 Implement `checkLayerTwo` sub-function covering all admin-only actions: `admin.view_any_journey`, `admin.view_any_user`, `admin.view_any_test_result`, `admin.override_journey_state`, `admin.manage_content`, `admin.manage_users`, `admin.view_platform_stats`, `admin.manage_taxonomy`, `admin.manage_pothi`, `admin.manage_shlokas`, `admin.manage_resources`
- [x] 3.2 Implement shared admin+moderator actions: `moderator.review_custom_erc`, `moderator.manage_display_content`, `comment.moderate`
- [x] 3.3 Wire `checkLayerOne` and `checkLayerTwo` into the exported `hasPermission` function — returns `checkLayerOne(…) || checkLayerTwo(…)`

## 4. RequirePermission decorator

- [x] 4.1 Create `apps/api/src/common/permissions/require-permission.decorator.ts` — export `PERMISSION_KEY` constant and `@RequirePermission(action, resolver?)` `SetMetadata` decorator that stores `{ action, resolver }` in Reflector metadata

## 5. PermissionGuard

- [x] 5.1 Create `apps/api/src/common/permissions/permission.guard.ts` — `@Injectable()` NestJS guard implementing `CanActivate`
- [x] 5.2 In `canActivate`: read session from `request.user` (throw `SessionExpiredException` if absent), read `{ action, resolver }` from Reflector
- [x] 5.3 Call resolver with `(request, moduleRef)` if provided; default to `{ type: 'platform' }` if no resolver is set
- [x] 5.4 Call `hasPermission(user, resource, action)` — throw `AccessDeniedException` if `false`
- [x] 5.5 Log permission denials at `warn` level (structured, never log journey contents or PII beyond user ID)

## 6. Barrel export

- [x] 6.1 Create `apps/api/src/common/permissions/index.ts` exporting `hasPermission`, `PermissionGuard`, `RequirePermission`, `PERMISSION_KEY`, and all types from `types.ts`

## 7. Unit tests — hasPermission auth matrix

- [x] 7.1 Create `apps/api/src/common/permissions/has-permission.spec.ts` with test helper factories: `makeUser(roles, overrides?)`, `makeJourney(vatarthiId, vmAssignments?, overrides?)`, `makeErc(type, overrides?)`
- [x] 7.2 Write Layer 1 journey permission tests — one positive + one negative per row: `journey.create`, `journey.view` (own/journey-VM/global-VM/unassigned), `journey.pause`, `journey.resume`, `journey.complete`
- [x] 7.3 Write Layer 1 ERC permission tests: `erc.select`, `erc.suggest`, `erc.approve_closure` (self-approve no VM / denied with VM / VM approve), `erc.deactivate`, `erc.remove`
- [x] 7.4 Write Layer 1 custom ERC tests: `custom_erc.create`, `custom_erc.submit_for_review`, `custom_erc.edit` (own vs other's)
- [x] 7.5 Write Layer 1 test + chat + experience log + social tests
- [x] 7.6 Write Layer 1 invitation tests: `vm_invitation.send`, `vm_invitation.accept` (invitee vs non-invitee), `vm_invitation.cancel`, `vm_invitation.decline`
- [x] 7.7 Write Layer 2 admin permission tests — one positive + one negative per row
- [x] 7.8 Write Layer 2 shared admin+moderator tests: `moderator.review_custom_erc`, `moderator.manage_display_content`, `comment.moderate`
- [x] 7.9 Run `pnpm --filter api test --project unit` — all tests must pass

## 8. Integration tests — PermissionGuard

- [x] 8.1 Create `apps/api/src/common/permissions/permission.guard.integration.spec.ts` using the test app helper (`createTestApp`, `getRequest`, `withRollback`)
- [x] 8.2 Register a minimal fixture controller in the test module (not in production app) with two routes: one requiring `journey.view` with a resolver, one requiring `admin.manage_taxonomy` without a resolver
- [x] 8.3 Test: unauthenticated request → 401
- [x] 8.4 Test: authenticated user without permission → 403
- [x] 8.5 Test: authenticated user with permission → 200 (guard passes through)
- [x] 8.6 Run `pnpm --filter api test --project integration` — all tests must pass

## 9. Final check

- [x] 9.1 Run full test suite `pnpm --filter api test` — all unit and integration tests pass
- [x] 9.2 Confirm no `any` types introduced, no `@ts-ignore`, strict mode satisfied (`pnpm --filter api build` or `tsc --noEmit`)
- [x] 9.3 Confirm no Prisma imports outside repository files (no Prisma in `common/permissions/`)
