# content-suggestions

## Overview

Authenticated users with capability submit and retrieve their content suggestions; authorized triagers list and update them. [content-suggestions.controller.ts:ContentSuggestionsController] [content-suggestions.service.ts:ContentSuggestionsService]

## Interface

- Session POST content-suggestions, GET content-suggestions/mine, GET content-suggestions and PATCH content-suggestions/:id; creation is throttled and triage is audited. [content-suggestions.controller.ts:ContentSuggestionsController]
- ContentSuggestionsModule exports ContentSuggestionsService; repository exports suggestion input and record types. [content-suggestions.module.ts:ContentSuggestionsModule] [content-suggestions.repository.ts:SuggestionRecord] [content-suggestions.repository.ts:CreateSuggestionInput] [content-suggestions.repository.ts:TriageInput]
- [dto](./dto/README.md): Validation contracts describe suggestion creation, list filters and triage.

## Invariants

- Create and own reads check capability grants and feature mode; list and triage require platform triage permission. Own queries always scope authorId; route-specific query matches route and entityId, defaulting entityId to null. [content-suggestions.service.ts:allowed] [content-suggestions.service.ts:create] [content-suggestions.service.ts:listMine] [content-suggestions.service.ts:listAll] [content-suggestions.service.ts:triage] [content-suggestions.repository.ts:listForAuthorOnRoute]
- Triage rejects missing records, sets triagedById and preserves omitted resolution/link fields. [content-suggestions.service.ts:triage]

## Side Effects

- Prisma creates, reads, filters and updates contentSuggestion rows; admin lists include author display name and username. [content-suggestions.repository.ts:ContentSuggestionsRepository]
- Triage audit metadata records status. [content-suggestions.controller.ts:triage]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
