# dto

## Overview

CMS DTOs validate stable keys and bilingual page titles and rich-text objects. [cms-page.dto.ts:UpsertCmsPageDto] [cms-page.dto.ts:UpdateCmsPageDto]

## Interface

- Exports UpsertCmsPageDto and UpdateCmsPageDto. [cms-page.dto.ts:UpsertCmsPageDto] [cms-page.dto.ts:UpdateCmsPageDto]

## Invariants

- Upsert key matches lowercase letters/digits/hyphens and is at most 80 characters; titleEn is 1–300 characters, optional titleMr is at most 300; bodyEn is an object and bodyMr is optional object. [cms-page.dto.ts:UpsertCmsPageDto]
- Update fields are optional with titleEn 1–300, titleMr at most 300, and object bodyEn/bodyMr. [cms-page.dto.ts:UpdateCmsPageDto]

## Side Effects

- class-validator decorators register validation metadata. [cms-page.dto.ts:UpsertCmsPageDto] [cms-page.dto.ts:UpdateCmsPageDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
