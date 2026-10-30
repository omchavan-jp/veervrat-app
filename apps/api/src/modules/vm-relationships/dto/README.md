# dto

## Overview

Defines the global VM removal cascade request. [remove-global-vm.dto.ts:RemoveGlobalVmDto]

## Interface

- Optional cascade accepts keep or unassign. [remove-global-vm.dto.ts:RemoveGlobalVmDto]

## Invariants

- Omitted cascade defaults to keep in the controller. [../vm-relationships.controller.ts:removeGlobalVm]

## Side Effects

- Defines validation metadata. [remove-global-vm.dto.ts:RemoveGlobalVmDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
