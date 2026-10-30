# dto

## Overview

Validates rich-text log creation, updates and entity tags. [create-experience-log.dto.ts:CreateExperienceLogDto] [update-experience-log.dto.ts:UpdateExperienceLogDto]

## Interface

- Creation accepts a body, optional journey UUID and tags; updates accept body, visibility, draft flag and tags. [create-experience-log.dto.ts:CreateExperienceLogDto] [update-experience-log.dto.ts:UpdateExperienceLogDto]

## Invariants

- Tags are capped at 16 and each has an enum entity type and UUID entity ID. [create-experience-log.dto.ts:CreateExperienceLogDto] [update-experience-log.dto.ts:UpdateExperienceLogDto] [experience-tag.dto.ts:ExperienceTagDto]

## Side Effects

- Defines validation and transformation metadata. [experience-tag.dto.ts:ExperienceTagDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
