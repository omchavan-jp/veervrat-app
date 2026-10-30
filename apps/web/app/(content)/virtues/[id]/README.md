# [id]

## Overview

Virtue reader listing linked subvirtues. [apps/web/app/(content)/virtues/[id]/page.tsx:VirtueDetailPage]

## Interface

- Default VirtueDetailPage accepts promised id params and invokes virtuesApi.getVirtue. [apps/web/app/(content)/virtues/[id]/page.tsx:VirtueDetailPage]

## Invariants

- Errors and missing data share notFound UI with retry. [apps/web/app/(content)/virtues/[id]/page.tsx:VirtueDetailPage]

## Side Effects

- Queries virtue detail and offers refetch. [apps/web/app/(content)/virtues/[id]/page.tsx:VirtueDetailPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
