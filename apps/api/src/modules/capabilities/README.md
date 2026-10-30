# capabilities

## Overview

Resolves persisted capability grants and environment feature modes. [capabilities.service.ts:CapabilitiesService]

## Interface

- Global CapabilitiesModule exports CapabilitiesService and CapabilitiesRepository; service exposes grantsFor, assertProductDocsView and featureMode; repository lists simple/detailed grants and grants/revokes them. [capabilities.module.ts:CapabilitiesModule] [capabilities.service.ts:CapabilitiesService] [capabilities.repository.ts:CapabilitiesRepository]

## Invariants

- CONTENT_EDIT and PRODUCT_DOCS_VIEW are off in prod; edit additionally requires CONTENT_EDIT_ENABLED, docs requires PRODUCT_DOCS_MODE=granted, feedback requires FEEDBACK_MODE=granted, and CONTENT_SUGGEST always has granted mode. [capabilities.service.ts:featureMode]
- Product docs access requires hasPermission with current grants and mode; grant returns false if already present and revoke returns whether any row was deleted. [capabilities.service.ts:assertProductDocsView] [capabilities.repository.ts:grant] [capabilities.repository.ts:revoke]

## Side Effects

- Reads configuration and persisted userCapability rows per request; creates grants with grantedBy and deletes revoked grants. [capabilities.service.ts:featureMode] [capabilities.service.ts:grantsFor] [capabilities.repository.ts:CapabilitiesRepository]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
