# dashboard

## Overview

Authenticated VA dashboard aggregates journey and test statistics and recommends sentences from low-scoring answers. [dashboard.controller.ts:DashboardController] [dashboard.repository.ts:DashboardRepository]

## Interface

- Session GET dashboard/stats and dashboard/suggestions require isVa; service returns statistics and a suggestions wrapper. [dashboard.controller.ts:getStats] [dashboard.controller.ts:getSuggestions] [dashboard.service.ts:DashboardService]
- Repository exports DashboardStats and SuggestionItem types. [dashboard.repository.ts:DashboardStats] [dashboard.repository.ts:SuggestionItem]

## Invariants

- Statistics exclude deleted journeys, deactivated ERCs and draft tests; active journeys include ACTIVE and NOT_STARTED, and ERC counts use IN_PROGRESS and APPROVED. Virtue counts derive from active journeys. [dashboard.repository.ts:getStats]
- Suggestions use each weakness’s latest submitted test answers scoring at most 2, deduplicate sentence by lowest score, sort ascending and limit to 20. [dashboard.repository.ts:getSuggestions]

## Side Effects

- Prisma reads journeys, tests, answers and sentence taxonomy; no writes in assigned dashboard files. [dashboard.repository.ts:getStats] [dashboard.repository.ts:getSuggestions]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
