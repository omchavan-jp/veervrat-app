# shlokas

## Overview

Shloka browser with debounced search and fetched detail dialogs. [apps/web/app/(content)/shlokas/page.tsx:ShlokasPage]

## Interface

- Default ShlokasPage uses contentApi.shlokas/searchShlokas and CmsInfoModal key why-shlokas; local ShlokaCard accepts s/onOpen, DetailModal accepts id/onClose, ShlokaDetailBody accepts ShlokaDetail. [apps/web/app/(content)/shlokas/page.tsx:ShlokasPage] [apps/web/app/(content)/shlokas/page.tsx:ShlokaCard] [apps/web/app/(content)/shlokas/page.tsx:DetailModal] [apps/web/app/(content)/shlokas/page.tsx:ShlokaDetailBody]

## Invariants

- Search requires at least two trimmed characters after 250 ms debounce and disables list querying; detail formal tags omit missing names. [apps/web/app/(content)/shlokas/page.tsx:ShlokasPage] [apps/web/app/(content)/shlokas/page.tsx:ShlokaDetailBody]

## Side Effects

- Queries list/search and selected shloka detail; detail errors offer refetch. [apps/web/app/(content)/shlokas/page.tsx:ShlokasPage] [apps/web/app/(content)/shlokas/page.tsx:DetailModal]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
