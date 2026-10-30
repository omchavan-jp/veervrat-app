# follows

## Overview

Session-protected follow controller delegates user follow and unfollow actions. [follows.controller.ts:FollowsController]

## Interface

- POST and DELETE users/:username/follow call the service and return HTTP 200. [follows.controller.ts:follow] [follows.controller.ts:unfollow]
- FollowsService exports follow, unfollow, counts, directional status and mutual-follow helpers. [follows.service.ts:FollowsService] [follows.module.ts:FollowsModule]

## Invariants

- Both routes require SessionGuard. [follows.controller.ts:FollowsController]
- Follow and unfollow require platform permissions and a known target; self-follow is rejected. Repeated follow and unfollow are idempotent at the repository. [follows.service.ts:follow] [follows.service.ts:unfollow] [follows.repository.ts:follow] [follows.repository.ts:unfollow]
- Mutual follow requires both directed edges. [follows.repository.ts:areMutualFollows]

## Side Effects

- Delegates follow and unfollow actions to FollowsService. [follows.controller.ts:follow] [follows.controller.ts:unfollow]
- Prisma upserts and deletes follow edges; a new follow creates a NEW_FOLLOWER notification. [follows.repository.ts:follow] [follows.repository.ts:unfollow] [follows.service.ts:follow]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
