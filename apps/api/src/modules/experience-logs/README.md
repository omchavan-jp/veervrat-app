# experience-logs

## Overview

Experience logs support sanitized rich-text drafts, publishing, visibility, tags and public discovery. [experience-logs.service.ts:ExperienceLogsService] [experience-logs.repository.ts:ExperienceLogsRepository]

## Interface

- Authenticated endpoints create, list own, update and delete; public pool and individual reads permit optional sessions. Service also lists public entries by author. [experience-logs.controller.ts:ExperienceLogsController] [experience-logs.service.ts:getPublicByAuthor]
- Module imports authentication, journeys, follows and uploads and exports the service. [experience-logs.module.ts:ExperienceLogsModule]
- [dto](./dto/README.md): Validates rich-text log creation, updates and entity tags.

## Invariants

- Creation requires VA and permission, creates ONLY_ME drafts and sanitizes Tiptap; first publication stamps publishedAt. [experience-logs.service.ts:create] [experience-logs.service.ts:update] [experience-logs.repository.ts:create]
- Guest reads require public published entries; denied authenticated reads return not found, and FRIENDS checks mutual follows. [experience-logs.service.ts:getOne]
- Queries exclude soft-deleted entries; list pages contain up to 20 records. [experience-logs.repository.ts:findOwn] [experience-logs.repository.ts:findPublicPool]

## Side Effects

- Prisma creates, updates and soft-deletes logs; tag replacement is transactional. [experience-logs.repository.ts:create] [experience-logs.repository.ts:update] [experience-logs.repository.ts:softDelete]
- Saved body changes bind uploads to the log using its author identity. [experience-logs.service.ts:create] [experience-logs.service.ts:update]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
