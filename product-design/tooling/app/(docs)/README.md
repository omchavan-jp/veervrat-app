# (docs)

## Overview

Wraps documentation pages in the Fumadocs layout. [layout.tsx:Layout]

## Interface

- Default Layout accepts React children and obtains the page tree from the shared source loader. [layout.tsx:Layout]
- [Child contract](./%5B%5B...slug%5D%5D/README.md): [[...slug]].

## Invariants

- Navigation tree comes from source.getPageTree(). [layout.tsx:Layout]

## Side Effects

- Renders DocsLayout. [layout.tsx:Layout]

## Verification

From `product-design/tooling`, run `pnpm validate` to check governance and D2 sources. This was not run during documentation generation.
