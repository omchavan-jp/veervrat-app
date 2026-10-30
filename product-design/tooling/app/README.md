# app

## Overview

Root document shell and Fumadocs provider. [layout.tsx:Layout]

## Interface

- Layout accepts children and exports metadata. [layout.tsx:Layout] [layout.tsx:metadata]
- [Child contract](./%28docs%29/README.md): (docs).
- [Child contract](./00-governance/README.md): 00-governance.
- [Child contract](./api/README.md): api.
- [Child contract](./components/README.md): components.

## Invariants

- Static search points to /product-docs/api/search. [layout.tsx:RootProvider]

## Side Effects

- Imports global CSS and renders the document shell. [layout.tsx:Layout]

## Verification

From `product-design/tooling`, run `pnpm validate` to check governance and D2 sources. This was not run during documentation generation.
