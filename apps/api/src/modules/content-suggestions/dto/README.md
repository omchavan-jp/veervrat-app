# dto

## Overview

Validation contracts describe suggestion creation, list filters and triage. [create-suggestion.dto.ts:CreateSuggestionDto] [triage-suggestion.dto.ts:TriageSuggestionDto]

## Interface

- Exports CreateSuggestionDto, MineQueryDto, ListSuggestionsQueryDto and TriageSuggestionDto. [create-suggestion.dto.ts:CreateSuggestionDto] [mine.query.dto.ts:MineQueryDto] [list-suggestions.query.dto.ts:ListSuggestionsQueryDto] [triage-suggestion.dto.ts:TriageSuggestionDto]

## Invariants

- Create requires kind enum, nonempty route and URL up to 512, EN/MR locale and nonempty English title up to 200; optional context fields have bounds and bodies are objects. [create-suggestion.dto.ts:CreateSuggestionDto]
- List filters constrain status enum, route and entity type; mine accepts route and entityId; triage requires status enum with bounded optional resolution and links. [list-suggestions.query.dto.ts:ListSuggestionsQueryDto] [mine.query.dto.ts:MineQueryDto] [triage-suggestion.dto.ts:TriageSuggestionDto]

## Side Effects

- class-validator decorators register validation metadata. [create-suggestion.dto.ts:CreateSuggestionDto] [mine.query.dto.ts:MineQueryDto] [list-suggestions.query.dto.ts:ListSuggestionsQueryDto] [triage-suggestion.dto.ts:TriageSuggestionDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
