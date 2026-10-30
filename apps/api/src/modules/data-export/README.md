# data-export

## Overview

DataExportModule registers export service and repository and exposes the service. [data-export.module.ts:DataExportModule]

## Interface

- Imports AuthModule and exports DataExportService. [data-export.module.ts:DataExportModule]
- DataExportService.exportFor aggregates identity, accounts, consents, assessments, journeys, logs, messages, blogs, suggestions, follows, invitations and feedback. [data-export.service.ts:exportFor]
- createExportToken and verifyExportToken encode and validate a user ID with an expiry and HMAC. [export-token.ts:createExportToken] [export-token.ts:verifyExportToken]

## Invariants

- Module wiring shown does not define export behavior. [data-export.module.ts:DataExportModule]
- Export excludes password hashes, audit events, invitation tokens, revoked mentor sidenotes and deleted experience logs, blogs and comments; chat membership uses roomId substring matching. [data-export.repository.ts:DataExportRepository] [data-export.repository.ts:journeys] [data-export.repository.ts:chatMessages] [data-export.repository.ts:invitations]
- Tokens use a domain-prefixed secret and a 24-hour TTL; malformed, mismatched or expired tokens return null. [export-token.ts:createExportToken] [export-token.ts:verifyExportToken]

## Side Effects

- Nest module registration supplies providers. [data-export.module.ts:DataExportModule]
- Export performs parallel Prisma reads and stamps the current time; token creation and verification use the clock and crypto. [data-export.service.ts:exportFor] [data-export.repository.ts:DataExportRepository] [export-token.ts:createExportToken] [export-token.ts:verifyExportToken]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
