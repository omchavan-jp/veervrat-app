# virtues

## Overview

Browser combines virtue cards and weaknesses flattened from clusters. [apps/web/app/(content)/virtues/page.tsx:VirtuesBrowserPage]

## Interface

- Default VirtuesBrowserPage invokes virtuesApi.list and weaknessesApi.list; local excerpt truncates text with an ellipsis and returns empty string for missing text. [apps/web/app/(content)/virtues/page.tsx:VirtuesBrowserPage] [apps/web/app/(content)/virtues/page.tsx:excerpt]
- [\[id\]](./%5Bid%5D/README.md): Virtue reader listing linked subvirtues. [apps/web/app/(content)/virtues/[id]/page.tsx:VirtueDetailPage]

## Invariants

- No explicit invariants identified.

## Side Effects

- Queries virtues and weaknesses independently. [apps/web/app/(content)/virtues/page.tsx:VirtuesBrowserPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
