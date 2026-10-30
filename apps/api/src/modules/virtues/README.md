# virtues

## Overview

Read-only catalog endpoints expose virtues, subvirtues and sentences. [virtues.controller.ts:VirtuesController]

## Interface

- Guest-accessible endpoints list virtues and fetch virtue, subvirtue and sentence details. [virtues.controller.ts:VirtuesController]
- Sentence responses include an active journey indicator for authenticated vratarthi users. [virtues.service.ts:getSentence]

## Invariants

- Missing catalog entries raise entity-not-found errors; guests and non-vratarthi users receive a false active-journey indicator. [virtues.service.ts:getVirtue] [virtues.service.ts:getSubvirtue] [virtues.service.ts:getSentence]
- Virtues and subvirtues are ordered by English name; subvirtue weaknesses by priority and sentences by creation time. [virtues.repository.ts:listVirtues] [virtues.repository.ts:findVirtueById] [virtues.repository.ts:findSubvirtueById]

## Side Effects

- Reads catalog records through Prisma and checks journey state. [virtues.repository.ts:VirtuesRepository] [virtues.service.ts:getSentence]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
