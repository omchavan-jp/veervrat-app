# Shared API types

## Overview

This directory declares shared TypeScript response types. [index.ts:ApiResponse]

## Interface

- `ApiResponse<T>` contains `data` and optional pagination metadata. [index.ts:ApiResponse]
- `PaginationMeta` describes a cursor, page size and optional total; `ApiError` describes an error response and optional details. [index.ts:PaginationMeta] [index.ts:ApiError]

## Invariants

- `nextCursor` may be a string or null. [index.ts:PaginationMeta]

## Side Effects

- None: the file contains only type declarations. [index.ts:ApiResponse] [index.ts:PaginationMeta] [index.ts:ApiError]

## Verification

From the repository root, `pnpm --filter @veervrat/types typecheck` checks the package's TypeScript types. This check was not run for this documentation change.
