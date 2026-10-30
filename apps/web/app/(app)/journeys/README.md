# journeys

## Overview

Journey listing with localized sentence/weakness content, state styling, and updated dates. [apps/web/app/(app)/journeys/page.tsx:JourneysPage]

## Interface

- Exports default JourneysPage; consumes useJourneys and renders loading skeleton, load error, empty state linking /study, or journey links. [apps/web/app/(app)/journeys/page.tsx:JourneysPage]
- STATE_COLORS supplies styles for NOT_STARTED, ACTIVE, PAUSED, DORMANT, and COMPLETED. [apps/web/app/(app)/journeys/page.tsx:STATE_COLORS]
- [\[id\]](./%5Bid%5D/README.md): Journey detail UI with editable title, state actions, ERC counts, activity, and overview/exposures/resolutions/challenges/chat tabs. [apps/web/app/(app)/journeys/[id]/page.tsx:JourneyDetailPage]
- [new](./new/README.md): Creation entry component driven by sentenceId and weaknessId search parameters. [apps/web/app/(app)/journeys/new/page.tsx:NewJourneyPage]

## Invariants

- A separate custom title is shown only when journey.title.trim() differs from journey.sentence.textEn.trim(); otherwise bilingual sentence content is used as the heading. [apps/web/app/(app)/journeys/page.tsx:JourneysPage]

## Side Effects

- The imported useJourneys hook queries journeysApi.list under queryKeys.journeys.all; its API owner sends GET /journeys [apps/web/app/(app)/journeys/page.tsx:JourneysPage] [apps/web/hooks/use-journeys.ts:useJourneys] [apps/web/lib/api/journeys.ts:journeysApi.list].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
