# dto

## Overview

Notification list query validates cursor and page size. [list-notifications.dto.ts:ListNotificationsDto]

## Interface

- Optional cursor is a string and pageSize is transformed to a number. [list-notifications.dto.ts:ListNotificationsDto]

## Invariants

- Page size is an integer from 1 to 100, defaulting to 20. [list-notifications.dto.ts:ListNotificationsDto]

## Side Effects

- Defines query validation and transformation metadata. [list-notifications.dto.ts:ListNotificationsDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
