# permissions

## Overview

Provides resource-aware permission evaluation and Nest permission metadata/guard enforcement [has-permission.ts:hasPermission] [permission.guard.ts:PermissionGuard] [require-permission.decorator.ts:RequirePermission].

## Interface

- Evaluate participant and platform actions synchronously with hasPermission(user, resource, action) [has-permission.ts:hasPermission].
- Attach action and optional async resource resolver metadata with RequirePermission and enforce it through PermissionGuard [require-permission.decorator.ts:RequirePermission] [require-permission.decorator.ts:PermissionResolver] [permission.guard.ts:PermissionGuard].
- Export action/resource unions, slim resource shapes, feature modes, role/ownership/assignment helpers and room participation predicate [types.ts:PermissionAction] [types.ts:PermissionResource] [types.ts:FeatureMode] [types.ts:isRoomParticipant] [index.ts:hasPermission].

## Invariants

- Unknown actions deny access and gated platform features require granted mode plus the matching capability [has-permission.ts:hasPermission].
- Missing permission metadata denies access and missing request identity raises SessionExpiredException [permission.guard.ts:PermissionGuard.canActivate].
- Room access requires relationshipVerified and identity matching one of the two room IDs [types.ts:isRoomParticipant].
- Experience drafts are visible only to their author and custom ERC edit/delete require creator identity plus NOT_STARTED or IN_PROGRESS status [has-permission.ts:hasPermission].

## Side Effects

- RequirePermission writes Nest metadata and PermissionGuard logs denied identity/action/resource type before raising AccessDeniedException [require-permission.decorator.ts:RequirePermission] [permission.guard.ts:PermissionGuard.canActivate].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
