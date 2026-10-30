# audit

## Overview

Audit event persistence, listing and handler metadata capture, with a global module importing AuthModule and exporting AuditService. [audit.module.ts:AuditModule] [audit.interceptor.ts:AuditInterceptor]

## Interface

- AuditController declares GET admin/audit-events with cursor/action/actorId query inputs; AuditService exposes record and list; AuditRepository exposes create and list with optional take. [audit.controller.ts:AuditController] [audit.service.ts:AuditService] [audit.repository.ts:AuditRepository]
- Audited, AUDIT_METADATA_KEY, AuditContext and AuditOptions define handler metadata and request/result callbacks; AuditWrite defines persisted event fields. [audited.decorator.ts:Audited] [audited.decorator.ts:AuditOptions] [audit.repository.ts:AuditWrite]
- AuditInterceptor exposes intercept; clientIp resolves first x-forwarded-for entry, then request IP, then socket address. [audit.interceptor.ts:AuditInterceptor.intercept] [audit.interceptor.ts:clientIp]

## Invariants

- The audit listing controller applies SessionGuard and rejects !isAdmin(user). [audit.controller.ts:AuditController.list]
- Only handlers carrying audit metadata trigger capture; successful emitted results are unwrapped from data envelopes; callback resourceId takes precedence over resourceIdParam. [audit.interceptor.ts:AuditInterceptor.intercept]
- record fills omitted event fields with null and catches rejected repository writes; listing defaults to 50, orders createdAt descending, skips the cursor row and returns a nextCursor only for a full page. [audit.service.ts:AuditService.record] [audit.repository.ts:AuditRepository.list]

## Side Effects

- Audited attaches audit:options metadata to handlers. [audited.decorator.ts:Audited]
- Successful intercepted handlers initiate audit writes capturing actor, request metadata, resource and action; repository creates auditEvent rows and reads filtered pages. [audit.interceptor.ts:AuditInterceptor.intercept] [audit.repository.ts:AuditRepository.create] [audit.repository.ts:AuditRepository.list]
- Rejected asynchronous audit writes log warning objects including action and error. [audit.service.ts:AuditService.record]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
