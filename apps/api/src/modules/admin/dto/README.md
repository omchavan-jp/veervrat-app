# dto

## Overview

Validated payloads for pothi sections, resources, shlokas and taxonomy. [pothi.dto.ts:CreatePothiSectionDto] [resource.dto.ts:CreateResourceDto] [shloka.dto.ts:CreateShlokaDto] [taxonomy.dto.ts:CreateVirtueDto]

## Interface

- CreatePothiSectionDto and UpdatePothiSectionDto expose section number, bilingual titles, commentary text and shloka IDs. [pothi.dto.ts:CreatePothiSectionDto] [pothi.dto.ts:UpdatePothiSectionDto]
- CreateResourceDto/UpdateResourceDto expose resource type, locations, title, description and tags; FormalTagDto is imported from local shloka.dto. [resource.dto.ts:CreateResourceDto] [resource.dto.ts:UpdateResourceDto]
- FormalTagDto, CreateShlokaDto, UpdateShlokaDto, ScheduleShlokaDto and ReorderQueueDto expose tag, text, schedule and queue inputs. [shloka.dto.ts:FormalTagDto] [shloka.dto.ts:ScheduleShlokaDto] [shloka.dto.ts:ReorderQueueDto]
- Create/UpdateVirtueDto, Create/UpdateSubvirtueDto, Create/UpdateWeaknessDto and LinkWeaknessSubvirtueDto expose taxonomy inputs through inheritance. [taxonomy.dto.ts:CreateVirtueDto] [taxonomy.dto.ts:LinkWeaknessSubvirtueDto]

## Invariants

- Pothi section numbers are nonnegative integers; titleEn is 1–300 characters; optional shlokaIds has at most 200 UUID v4 values. [pothi.dto.ts:CreatePothiSectionDto] [pothi.dto.ts:UpdatePothiSectionDto]
- Resource type uses ResourceType; title is 1–300 characters; location strings max 2000, oneLiner max 500, description an object, and each tag array max 40 with nested FormalTagDto transformation. [resource.dto.ts:CreateResourceDto] [resource.dto.ts:UpdateResourceDto]
- Shloka devanagariText is 1–4000 characters and becomes optional in UpdateShlokaDto; formal tags require TagEntityType and UUID; tag arrays max 40; schedule date is a string of max length 10; reorder accepts at most 500 UUID v4 values. [shloka.dto.ts:CreateShlokaDto] [shloka.dto.ts:UpdateShlokaDto] [shloka.dto.ts:FormalTagDto] [shloka.dto.ts:ScheduleShlokaDto] [shloka.dto.ts:ReorderQueueDto]
- Taxonomy names max 160 characters with nonempty nameEn on create; descriptions max 2000; subvirtue links require UUIDs; category max 8 characters; optional priority is a nonnegative integer. [taxonomy.dto.ts:CreateVirtueDto] [taxonomy.dto.ts:CreateSubvirtueDto] [taxonomy.dto.ts:CreateWeaknessDto] [taxonomy.dto.ts:LinkWeaknessSubvirtueDto]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
