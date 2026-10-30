# journeys

## Overview

Journeys support creation, activity, state and completion workflows, plus scheduled dormant detection. [journeys.service.ts:JourneysService] [dormant-journeys.cron.ts:DormantJourneysCron]

## Interface

- Session-protected routes create, list, read, inspect activity, update state or title, submit completion and approve completion. [journeys.controller.ts:JourneysController]
- Service and repository are exported for other modules. [journeys.module.ts:JourneysModule]
- [dto](./dto/README.md): Journey DTOs validate creation, state action and title.

## Invariants

- A user cannot create another non-completed, non-deleted journey for the same sentence; database uniqueness conflicts are mapped back to a journey conflict. [journeys.service.ts:createJourney] [journeys.repository.ts:findActiveForSentence]
- Pause requires ACTIVE; resume requires PAUSED or DORMANT. Title edits require view permission and ownership. [journeys.service.ts:updateState] [journeys.service.ts:updateTitle]
- Creation and listing require a session at the controller; createJourney does not evaluate journey.create or require a VA role. [journeys.controller.ts:JourneysController] [journeys.service.ts:createJourney]
- Completion requires ACTIVE and permissions; a VA completes immediately without an active journey VM, otherwise submits for approval. A permitted VM may approve without a prior completion submission. Neither completion path checks ERC counts or thresholds. [journeys.service.ts:submitCompletion] [journeys.service.ts:approveCompletion]
- Lists return up to 20 non-deleted owner journeys; activity merges one event per ERC item (approvedAt, otherwise submittedAt, otherwise startedAt), check-ins and unrevoked sidenotes and returns the newest eight by default. [journeys.repository.ts:findAll] [journeys.repository.ts:getActivity]

## Side Effects

- Prisma creates and updates journeys; completion submission and approval notify the relevant VM or VA. [journeys.repository.ts:create] [journeys.repository.ts:updateState] [journeys.service.ts:submitCompletion] [journeys.service.ts:approveCompletion]
- Daily 02:00 cron marks ACTIVE non-deleted journeys whose updatedAt is older than 30 days DORMANT and notifies the owner and active journey VMs. [dormant-journeys.cron.ts:detectDormant] [journeys.repository.ts:findStaleActiveJourneys]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
