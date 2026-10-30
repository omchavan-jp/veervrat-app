# weaknesses

## Overview

Guest-accessible weakness catalog adds personalized test and journey information when signed in. [weaknesses.controller.ts:WeaknessesController] [weaknesses.repository.ts:WeaknessesRepository]

## Interface

- List returns clusters and detail returns subvirtues, sentences, test history and draft ID. [weaknesses.service.ts:listWeaknesses] [weaknesses.repository.ts:findById]

## Invariants

- Lists emit only A, B, C and other clusters in that order; null categories map to other, while unrecognized nonnull categories are omitted. Missing weakness detail raises entity-not-found. [weaknesses.service.ts:listWeaknesses] [weaknesses.service.ts:getWeakness]
- Personal stats count submitted tests and active or paused journeys; anonymous stats are null. [weaknesses.repository.ts:findAll]

## Side Effects

- Reads weakness, journey, test and sentence records through Prisma. [weaknesses.repository.ts:findAll] [weaknesses.repository.ts:findById]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
