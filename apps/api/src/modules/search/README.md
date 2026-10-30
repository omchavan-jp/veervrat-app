# search

## Overview

Global search module provides PostgreSQL user search, unavailable blog and shloka search stubs, and a Meilisearch wrapper. [search.module.ts:SearchModule] [users-index.service.ts:UsersIndexService]

## Interface

- Index services expose upsert, remove and search; SearchModule exports them and MeiliService. [search.module.ts:SearchModule] [blogs-index.service.ts:BlogsIndexService] [shlokas-index.service.ts:ShlokasIndexService]

## Invariants

- User search excludes private and deleted profiles and the requester, ranks by trigram similarity, returns IDs and returns empty on blank query or database failure. [users-index.service.ts:search]
- Blog and shloka searches reject with HTTP 501; their maintenance methods and user index maintenance are no-ops. [blogs-index.service.ts:search] [shlokas-index.service.ts:search] [search-unavailable.exception.ts:SearchUnavailableException] [users-index.service.ts:upsert]

## Side Effects

- User search queries PostgreSQL and logs failures; Meili index creation is best-effort and health checks report availability. [users-index.service.ts:search] [meili.service.ts:ensureIndex] [meili.service.ts:health]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
