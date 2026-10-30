# new

## Overview

Creation entry component driven by sentenceId and weaknessId search parameters. [apps/web/app/(app)/journeys/new/page.tsx:NewJourneyPage]

## Interface

- Exports default NewJourneyPage and renders a creating spinner while its mount effect invokes useCreateJourney mutation. [apps/web/app/(app)/journeys/new/page.tsx:NewJourneyPage]

## Invariants

- Both sentenceId and weaknessId are required to invoke creation; missing either replaces navigation with /study. [apps/web/app/(app)/journeys/new/page.tsx:NewJourneyPage]

## Side Effects

- Creates with sentenceId/weaknessId, replaces navigation with the returned journey; ApiError 409 with details.existingJourneyId navigates to that existing journey; other failures toast and replace with /study. [apps/web/app/(app)/journeys/new/page.tsx:NewJourneyPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
