# [id]

## Overview

Journey detail UI with editable title, state actions, ERC counts, activity, and overview/exposures/resolutions/challenges/chat tabs. [apps/web/app/(app)/journeys/[id]/page.tsx:JourneyDetailPage]

## Interface

- Exports default JourneyDetailPage, reads id via useParams, consumes useJourney/useUpdateJourneyState/useUpdateJourneyTitle/useCompleteJourney, and passes journeyId, hasVm, viewerIsVm to ERC tabs. [apps/web/app/(app)/journeys/[id]/page.tsx:JourneyDetailPage]
- Local ErcCard displays total, active, and approved counts; Tab enumerates overview, exposures, resolutions, challenges, and chat. [apps/web/app/(app)/journeys/[id]/page.tsx:ErcCard] [apps/web/app/(app)/journeys/[id]/page.tsx:Tab]

## Invariants

- Title blur saves a trimmed nonempty title only when the raw edit differs from journey.title; Enter triggers blur. [apps/web/app/(app)/journeys/[id]/page.tsx:JourneyDetailPage]
- Pause is shown for ACTIVE, resume for PAUSED/DORMANT, and completion for ACTIVE with at least one approved ERC item; these are UI conditions. [apps/web/app/(app)/journeys/[id]/page.tsx:JourneyDetailPage]
- viewerIsVm requires a non-owner authenticated user who matches globalVmRelationship.vmId or an ACTIVE vmAssignment; chat prefers the global VM then the first ACTIVE assignment. [apps/web/app/(app)/journeys/[id]/page.tsx:JourneyDetailPage]

## Side Effects

- Invokes title, pause/resume, and completion mutations; completion emits success or destructive error toasts, retry calls refetch, and unmount clears debounceRef if present. [apps/web/app/(app)/journeys/[id]/page.tsx:JourneyDetailPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
