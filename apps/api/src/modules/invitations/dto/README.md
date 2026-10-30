# dto

## Overview

Invitation DTOs validate invitation type, optional recipient and scope, and token parameters. [send-invitation.dto.ts:SendInvitationDto] [token-param.dto.ts:TokenParamDto]

## Interface

- Send accepts type, optional email, username and scope UUID. [send-invitation.dto.ts:SendInvitationDto]

## Invariants

- Email must be valid when present, scope must be a UUID and token must be a nonempty string. [send-invitation.dto.ts:SendInvitationDto] [token-param.dto.ts:TokenParamDto]

## Side Effects

- Defines validation metadata. [send-invitation.dto.ts:SendInvitationDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
