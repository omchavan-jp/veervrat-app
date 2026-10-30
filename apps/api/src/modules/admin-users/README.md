# admin-users

## Overview

AdminUsersModule wires account administration with AuthModule, JourneysModule and UsersModule. [admin-users.module.ts:AdminUsersModule]

## Interface

- AdminUsersController: GET admin/users (cursor/q), GET admin/users/:id, PATCH admin/users/:id/roles and /capabilities, POST admin/users/:id/suspend, /force-logout and /anonymise; PATCH admin/journeys/:id/state. [admin-users.controller.ts:AdminUsersController]
- AdminUsersService exports list/getDetail, updateRoles/updateCapabilities, setSuspended/forceLogout/anonymise and overrideJourneyState; detail flattens each journey's weakness joins. [admin-users.service.ts:AdminUsersService] [admin-users.service.ts:getDetail]
- AdminUsersRepository exports list/findDetail/findById, addRoles/removeRoles, setSuspended and cancelPendingInvitations; list defaults to 30 records ordered by createdAt descending, optionally searches displayName/username/email case-insensitively, and returns items/nextCursor. [admin-users.repository.ts:AdminUsersRepository] [admin-users.repository.ts:list]
- [dto](./dto/README.md): Validation DTOs for role/capability edits, suspension, anonymisation and journey overrides.

## Invariants

- Controller declares SessionGuard; list/detail require admin.view_any_user, account/role/capability changes require admin.manage_users, and journey overrides require admin.override_journey_state on platform. [admin-users.controller.ts:AdminUsersController] [admin-users.service.ts:assertView] [admin-users.service.ts:assertManage] [admin-users.service.ts:overrideJourneyState]
- Role updates reject removal of the caller's own ADMIN role; suspension changes and anonymisation reject self-targeting; anonymisation rejects already anonymised targets. Account mutation methods require existing users. [admin-users.service.ts:updateRoles] [admin-users.service.ts:setSuspended] [admin-users.service.ts:anonymise] [admin-users.service.ts:updateCapabilities] [admin-users.service.ts:forceLogout]
- Capability revocations run before grants; detailed grant/revoke audit entries are emitted only for changes reported by the capability repository. Role removals run before additions. [admin-users.service.ts:updateCapabilities] [admin-users.service.ts:updateRoles]

## Side Effects

- Role methods create/delete userRole rows (creation skips duplicates); setSuspended writes suspendedAt; cancelPendingInvitations changes PENDING invitations for an inviter to CANCELLED. [admin-users.repository.ts:addRoles] [admin-users.repository.ts:removeRoles] [admin-users.repository.ts:setSuspended] [admin-users.repository.ts:cancelPendingInvitations]
- Suspending invokes AuthService.forceLogout; explicit logout invokes the same service; anonymisation delegates to UsersService.anonymiseAccount; journey override delegates to JourneysService.adminOverrideState. [admin-users.service.ts:setSuspended] [admin-users.service.ts:forceLogout] [admin-users.service.ts:anonymise] [admin-users.service.ts:overrideJourneyState]
- Capability changes invoke grant/revoke and record admin.capability.granted/revoked with capability, target displayName and username metadata; mutation endpoints also declare Audited decorators. [admin-users.service.ts:updateCapabilities] [admin-users.controller.ts:AdminUsersController]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
