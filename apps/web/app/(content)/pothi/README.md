# pothi

## Overview

Pothi section reader with bilingual headings and embedded shlokas. [apps/web/app/(content)/pothi/page.tsx:PothiPage]

## Interface

- Default PothiPage uses contentApi.pothiSections, CmsInfoModal key what-is-pothi and links to shlokas/resources; local ShlokaBlock accepts Shloka. [apps/web/app/(content)/pothi/page.tsx:PothiPage] [apps/web/app/(content)/pothi/page.tsx:ShlokaBlock]

## Invariants

- No explicit invariants identified.

## Side Effects

- Queries pothi sections. [apps/web/app/(content)/pothi/page.tsx:PothiPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
