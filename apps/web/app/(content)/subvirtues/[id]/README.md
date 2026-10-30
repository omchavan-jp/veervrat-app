# [id]

## Overview

Subvirtue reader with virtue ancestry, related weaknesses and sentence links. [apps/web/app/(content)/subvirtues/[id]/page.tsx:SubvirtueDetailPage]

## Interface

- Default SubvirtueDetailPage accepts promised id params and invokes virtuesApi.getSubvirtue. [apps/web/app/(content)/subvirtues/[id]/page.tsx:SubvirtueDetailPage]

## Invariants

- Parent virtue name selects Marathi only for mr locale with a truthy Marathi name, otherwise English. [apps/web/app/(content)/subvirtues/[id]/page.tsx:SubvirtueDetailPage]

## Side Effects

- Queries subvirtue detail. [apps/web/app/(content)/subvirtues/[id]/page.tsx:SubvirtueDetailPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
