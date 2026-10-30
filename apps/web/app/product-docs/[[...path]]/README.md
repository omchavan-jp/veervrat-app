# [[...path]]

## Overview

Authenticated Node route serving private static product documentation.

## Interface

- Exports dynamic Node GET and HEAD handlers [route.ts:runtime] [route.ts:dynamic] [route.ts:GET] [route.ts:HEAD].

## Invariants

- Requires granted mode and session; authoritative 401/403 responses are not overridden by API fallback [route.ts:handle] [route.ts:checkAccess].
- Rejects traversal and resolves real paths within static root; responses are private, no-store and noindex [route.ts:handle] [route.ts:privateResponse].

## Side Effects

- Checks access via internal then public API, reads static files and logs unexpected file errors [route.ts:checkAccess] [route.ts:handle].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
