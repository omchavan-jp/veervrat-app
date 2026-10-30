# resources

## Overview

Resource browser with type filtering and fetched detail dialogs. [apps/web/app/(content)/resources/page.tsx:ResourcesPage]

## Interface

- Default ResourcesPage; local TypeFilter is empty string, FILE or LINK; DetailModal accepts id/onClose and ResourceDetailBody accepts ResourceDetail. [apps/web/app/(content)/resources/page.tsx:ResourcesPage] [apps/web/app/(content)/resources/page.tsx:TypeFilter] [apps/web/app/(content)/resources/page.tsx:DetailModal] [apps/web/app/(content)/resources/page.tsx:ResourceDetailBody]

## Invariants

- Empty filter is passed as undefined. External resource URLs use target=\_blank and rel=noopener noreferrer nofollow; unnamed formal tags are filtered. [apps/web/app/(content)/resources/page.tsx:ResourcesPage] [apps/web/app/(content)/resources/page.tsx:ResourceDetailBody]

## Side Effects

- Queries resources by type and resource detail by selected id; detail error offers refetch. [apps/web/app/(content)/resources/page.tsx:ResourcesPage] [apps/web/app/(content)/resources/page.tsx:DetailModal]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
