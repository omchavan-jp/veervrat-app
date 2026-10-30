# content

## Overview

Public content reads expose pothi sections, shlokas, daily selection and resources. [content.controller.ts:ContentController]

## Interface

- Optional-session GET pothi/sections, shlokas/search?q, shlokas/today, shlokas?source&cursor, shlokas/:id, resources?type&cursor and resources/:id. [content.controller.ts:ContentController]
- ContentModule registers controller/service/repository and exports ContentService; service also exposes syncShlokaToIndex/removeShlokaFromIndex, repository exports ResolvedTag. [content.module.ts:ContentModule] [content.service.ts:ContentService] [content.repository.ts:ResolvedTag]
- ContentService exposes pothi, shloka list/search/detail/today and resource list/detail, plus index synchronization; ContentRepository exports ResolvedTag. [content.service.ts:ContentService] [content.repository.ts:ResolvedTag]

## Invariants

- Search trims and returns empty below two characters; daily shloka uses scheduled UTC date before queue rotation; missing detail throws EntityNotFoundException. [content.service.ts:searchShlokas] [content.service.ts:getToday] [content.service.ts:getShloka] [content.service.ts:getResource]
- Shloka/resource lists default to 24-item cursor pages; source matching is case insensitive; formal tags resolve names or null. [content.repository.ts:listShlokas] [content.repository.ts:listResources] [content.repository.ts:resolveTags]
- Search trims input and returns empty for fewer than two characters; detail lookup throws when absent; scheduled UTC date takes precedence over rotating queue. [content.service.ts:searchShlokas] [content.service.ts:getShloka] [content.service.ts:getResource] [content.service.ts:getToday]
- Lists default to 24 and cursor pagination; source matching is case insensitive; formal tags resolve to display names or null. [content.repository.ts:listShlokas] [content.repository.ts:listResources] [content.repository.ts:resolveTags]

## Side Effects

- Reads pothi, shlokas, schedules, queue, resources and taxonomy records via Prisma. Search maintenance is invoked on initialization and mutations, but ShlokasIndexService maintenance is currently a no-op; queries of at least two characters reject with HTTP 501. [content.repository.ts:ContentRepository] [content.service.ts:onModuleInit] [content.service.ts:searchShlokas] [content.service.ts:syncShlokaToIndex] [content.service.ts:removeShlokaFromIndex] [../search/shlokas-index.service.ts:ShlokasIndexService]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
