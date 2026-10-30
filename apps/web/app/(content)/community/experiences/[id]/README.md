# [id]

## Overview

Experience reader delegates retrieval to experienceLogsApi.getOne. [apps/web/app/(content)/community/experiences/[id]/page.tsx:ExperienceDetailPage]

## Interface

- Default ExperienceDetailPage accepts promised id params, renders body through MessageContent and displays author/date/tags. [apps/web/app/(content)/community/experiences/[id]/page.tsx:ExperienceDetailPage]

## Invariants

- Automatic retries are disabled; errors and missing data share the notFound branch. Visibility and edit link are shown only when user.id equals authorId. [apps/web/app/(content)/community/experiences/[id]/page.tsx:ExperienceDetailPage]

## Side Effects

- Queries experience detail and offers manual refetch. [apps/web/app/(content)/community/experiences/[id]/page.tsx:ExperienceDetailPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
