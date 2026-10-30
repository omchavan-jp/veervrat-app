# edit

## Overview

Loads an experience and delegates editing to ExperienceEditor [apps/web/app/(app)/experiences/[id]/edit/page.tsx:EditExperiencePage].

## Interface

- Default EditExperiencePage accepts params Promise with id and supplies existing data plus journeyId or undefined to ExperienceEditor [apps/web/app/(app)/experiences/[id]/edit/page.tsx:EditExperiencePage].

## Invariants

- Editor renders only after loading ends and data exists without query error; missing/error state links to /experiences [apps/web/app/(app)/experiences/[id]/edit/page.tsx:EditExperiencePage].

## Side Effects

- Queries experienceLogsApi.getOne(id) with queryKeys.experiences.detail(id) [apps/web/app/(app)/experiences/[id]/edit/page.tsx:EditExperiencePage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
