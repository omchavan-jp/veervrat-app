# vm-relationships

## Overview

Manages global and journey-scoped vratmitra relationships and rosters. [vm-relationships.service.ts:VmRelationshipsService] [vm-relationships.repository.ts:VmRelationshipsRepository]

## Interface

- Session-protected endpoints list a user’s VMs and vratarthis, remove a global VM and withdraw a journey VM. [vm-relationships.controller.ts:VmRelationshipsController]
- Exports relationship context, assignment and relationship checks for other modules. [vm-relationships.repository.ts:getVratarthiVmContext] [vm-relationships.repository.ts:hasActiveRelationshipBetween]
- [dto](./dto/README.md): Defines the global VM removal cascade request.

## Invariants

- Global removal requires a vratarthi, defaults to keeping journey assignments, and optionally ends them; pending approvals are untouched. [vm-relationships.service.ts:removeGlobalVm]
- Journey withdrawal requires an active assignment and permission; getVmAssignedJourneys excludes deleted journeys. Roster, context and active-relationship queries do not apply that deleted-journey filter. [vm-relationships.service.ts:withdrawJourneyVm] [vm-relationships.repository.ts:getVmAssignedJourneys] [vm-relationships.repository.ts:getMyVms] [vm-relationships.repository.ts:listVratarthisForVm] [vm-relationships.repository.ts:getVratarthiVmContext] [vm-relationships.repository.ts:hasActiveRelationshipBetween]
- Mentor rosters combine active global and journey relationships, deduplicating people with global scope first. [vm-relationships.repository.ts:listVratarthisForVm]

## Side Effects

- Creates and ends relationship and assignment records; removal and withdrawal create notifications. [vm-relationships.repository.ts:createGlobalRelationship] [vm-relationships.repository.ts:createJourneyAssignment] [vm-relationships.service.ts:removeGlobalVm] [vm-relationships.service.ts:withdrawJourneyVm]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
