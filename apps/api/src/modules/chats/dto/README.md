# dto

## Overview

Message DTO declares object content and room/journey/client correlation fields. [create-message.dto.ts:CreateMessageDto]

## Interface

- Exports CreateMessageDto with content, roomId, optional journeyId and optional tempId. [create-message.dto.ts:CreateMessageDto]

## Invariants

- Content must be an object; roomId is a string; optional journeyId and tempId are strings without declared length or UUID bounds. [create-message.dto.ts:CreateMessageDto]

## Side Effects

- class-validator decorators register validation metadata. [create-message.dto.ts:CreateMessageDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
