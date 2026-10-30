# actions

## Overview

Session-guarded action queue aggregation for owned journeys and assigned journey guidance. [actions.controller.ts:ActionsController] [actions.service.ts:ActionsService]

## Interface

- ActionsController exposes GET actions and GET vm-actions, delegating the current session user to getVaActions/getVmActions with HTTP 200. [actions.controller.ts:ActionsController.getVaActions] [actions.controller.ts:ActionsController.getVmActions]
- ActionsModule imports AuthModule/VmRelationshipsModule and registers ActionsController, ActionsService and ActionsRepository. [actions.module.ts:ActionsModule]
- getVaActions returns ercRevisit, suggestionsAwaitingDecision, pendingVmApprovals, newErcAvailable, journeyClosurePending and counts; getVmActions returns closureRequests, journeyCompletionRequests, suggestionStatusUpdates, customErcReviewStatus, hasAssignments and counts. [actions.service.ts:ActionsService.getVaActions] [actions.service.ts:ActionsService.getVmActions]
- ActionsRepository exports ErcType and ActionErcItem/ActionSuggestion/ActionJourney/ActionCustomReview shapes and provides status, sidenote, completion, custom-review, owned-journey and available-pool queries. [actions.repository.ts:ErcType] [actions.repository.ts:ActionErcItem] [actions.repository.ts:ActionSuggestion] [actions.repository.ts:ActionJourney] [actions.repository.ts:ActionCustomReview] [actions.repository.ts:ActionsRepository]

## Invariants

- Controller requires SessionGuard; getVaActions rejects users failing isVa and scopes queries to caller-owned undeleted journeys. [actions.controller.ts:ActionsController] [actions.service.ts:ActionsService.getVaActions] [actions.repository.ts:ActionsRepository.findOwnedJourneys]
- getVmActions queries assigned journey scope, retains only caller-authored suggestions, and reports assignment existence separately from queue counts. [actions.service.ts:ActionsService.getVmActions]
- ERC status queries exclude deactivated items and sort newest updated first; sidenotes exclude revoked entries and optionally acknowledged entries; completion requests exclude completed/deleted journeys and sort oldest submitted first. [actions.repository.ts:ActionsRepository.findErcItemsByStatus] [actions.repository.ts:ActionsRepository.findActiveSidenotes] [actions.repository.ts:ActionsRepository.findJourneysPendingCompletion]
- New ERC availability considers ACTIVE journeys with weakness tags and excludes pool items already selected; empty journey scopes yield empty query results. [actions.repository.ts:ActionsRepository.findJourneysWithNewErc] [actions.repository.ts:ActionsRepository.findErcItemsByStatus] [actions.repository.ts:ActionsRepository.findActiveSidenotes] [actions.repository.ts:ActionsRepository.findJourneysPendingCompletion] [actions.repository.ts:ActionsRepository.findCustomErcReviews]

## Side Effects

- Reads journey, ERC, sidenote and review state through Prisma queries; these queue queries do not write records. [actions.repository.ts:ActionsRepository]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
