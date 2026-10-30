# [id]

## Overview

Weakness reader with related subvirtues and study CTA. [apps/web/app/(content)/weaknesses/[id]/page.tsx:WeaknessBrowseDetailPage]

## Interface

- Default WeaknessBrowseDetailPage accepts promised id params, invokes weaknessesApi.detail and renders BackLink to /virtues. [apps/web/app/(content)/weaknesses/[id]/page.tsx:WeaknessBrowseDetailPage]

## Invariants

- Authenticated CTA links to /study/{weaknessId}; guests receive login link. [apps/web/app/(content)/weaknesses/[id]/page.tsx:WeaknessBrowseDetailPage]

## Side Effects

- Queries weakness detail. [apps/web/app/(content)/weaknesses/[id]/page.tsx:WeaknessBrowseDetailPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
