# consent

## Overview

Pure comparison of accepted consent versions against current policy versions. [outstanding-consents.ts:outstandingConsents]

## Interface

- Exports AcceptedConsent documentKey/version type and outstandingConsents(accepted,currentMap) returning documentKey/version array. [outstanding-consents.ts:AcceptedConsent] [outstanding-consents.ts:outstandingConsents]

## Invariants

- Uses highest accepted version per key; includes current keys only when accepted maximum (default -1) is below current version, ignores accepted-only keys and sorts results by documentKey localeCompare. [outstanding-consents.ts:outstandingConsents]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
