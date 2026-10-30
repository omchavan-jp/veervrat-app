# entity-search

## Overview

Authenticated entity-reference autocomplete searches shared taxonomy and a user’s own journey content. [entity-search.controller.ts:EntitySearchController] [entity-search.repository.ts:EntitySearchRepository]

## Interface

- Session GET entity-search delegates query and default all scope to service and wraps results in data; module exports the service. [entity-search.controller.ts:search] [entity-search.module.ts:EntitySearchModule]
- Repository exposes EntitySearchHit and searches weaknesses, virtues, subvirtues, sentences, own journeys and own ERC items. [entity-search.repository.ts:EntitySearchHit] [entity-search.repository.ts:EntitySearchRepository]
- search accepts a session user, query and all, concept or mine scope. [entity-search.service.ts:search]
- [dto](./dto/README.md): Validates autocomplete query parameters.

## Invariants

- Queries use case-insensitive substring matching or trigram similarity over 0.2, ranked by similarity and limited; labels prefer Marathi where present. [entity-search.repository.ts:searchWeaknesses] [entity-search.repository.ts:searchSentences]
- Journey search scopes owner and excludes deleted journeys; ERC search scopes owner but does not filter deleted journeys. [entity-search.repository.ts:searchOwnJourneys] [entity-search.repository.ts:searchOwnErcItems]
- Trimmed queries shorter than two characters return no hits; each repository search returns at most five hits, with exposures, resolutions and challenges sharing one five-hit ERC search. Search groups are interleaved and capped at twelve total hits. [entity-search.service.ts:search] [entity-search.service.ts:interleave] [entity-search.repository.ts:searchOwnErcItems]

## Side Effects

- Parameterized Prisma raw SQL reads taxonomy and journey tables using PostgreSQL similarity. [entity-search.repository.ts:EntitySearchRepository]
- Runs selected repository searches concurrently. [entity-search.service.ts:search]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
