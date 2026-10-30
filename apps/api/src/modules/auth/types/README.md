# types

## Overview

Authentication contracts describe session identity, session creation, provider identity and authentication results. [auth.types.ts:SessionUser]

## Interface

- SessionUser carries identity, roles, locale, profile and completion/verification dates; CreateSessionParams carries userId, IP, agent and ttlDays. [auth.types.ts:SessionUser] [auth.types.ts:CreateSessionParams]
- GoogleProfile carries googleId/email/name/emailVerified; AuthResult carries user/sessionToken; LinkPendingResult carries action/token. [auth.types.ts:GoogleProfile] [auth.types.ts:AuthResult] [auth.types.ts:LinkPendingResult]

## Invariants

- LinkPendingResult.action is the literal link_pending; nullable profile/date fields are explicit in SessionUser and GoogleProfile. [auth.types.ts:LinkPendingResult] [auth.types.ts:SessionUser] [auth.types.ts:GoogleProfile]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
