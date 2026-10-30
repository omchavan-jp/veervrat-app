# dto

## Overview

Validation DTOs for role/capability edits, suspension, anonymisation and journey overrides. [admin-users.dto.ts:UpdateRolesDto] [admin-users.dto.ts:UpdateCapabilitiesDto] [admin-users.dto.ts:SuspendUserDto] [admin-users.dto.ts:AnonymiseUserDto] [admin-users.dto.ts:OverrideJourneyStateDto]

## Interface

- Exports UpdateRolesDto and UpdateCapabilitiesDto with optional add/remove arrays, SuspendUserDto with suspended, AnonymiseUserDto with reason, and OverrideJourneyStateDto with state/reason. [admin-users.dto.ts:UpdateRolesDto] [admin-users.dto.ts:UpdateCapabilitiesDto] [admin-users.dto.ts:SuspendUserDto] [admin-users.dto.ts:AnonymiseUserDto] [admin-users.dto.ts:OverrideJourneyStateDto]

## Invariants

- Role/capability arrays require corresponding enum values and allow at most 10 entries each. [admin-users.dto.ts:UpdateRolesDto] [admin-users.dto.ts:UpdateCapabilitiesDto]
- Suspended requires a boolean; anonymisation/override reasons require strings of 3–500 characters; override state requires a JourneyState enum value. [admin-users.dto.ts:SuspendUserDto] [admin-users.dto.ts:AnonymiseUserDto] [admin-users.dto.ts:OverrideJourneyStateDto]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
