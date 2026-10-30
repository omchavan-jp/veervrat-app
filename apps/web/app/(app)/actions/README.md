# actions

## Overview

Action inbox displaying ERC revisit items, suggestions awaiting decisions, pending VM approvals, new ERC availability and journey closure items [apps/web/app/(app)/actions/page.tsx:ActionsPage].

## Interface

- Default export ActionsPage; internal SectionShell hides empty sections and Row supports optional links/actions and bilingual titles [apps/web/app/(app)/actions/page.tsx:ActionsPage] [apps/web/app/(app)/actions/page.tsx:SectionShell] [apps/web/app/(app)/actions/page.tsx:Row].

## Invariants

- counts.total equal to zero selects the empty state; sections with zero count render null; suggestion accept controls disable while their own itemId mutation is pending [apps/web/app/(app)/actions/page.tsx:ActionsPage] [apps/web/app/(app)/actions/page.tsx:SectionShell].

## Side Effects

- Fetches actionsApi.getVaActions; accept invokes ercApi.acknowledgeSidenote with journeyId/type/itemId, invalidates queryKeys.actions.va on success and shows an error toast on failure; retry calls refetch [apps/web/app/(app)/actions/page.tsx:ActionsPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
