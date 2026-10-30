# audit

## Overview

Client audit viewer renders action, timestamp, actor, resource, IP and optional JSON metadata. [apps/web/app/(admin)/admin/audit/page.tsx:AuditDashboardPage]

## Interface

- Default export AuditDashboardPage() exposes action and actor filter inputs; delegates listing to imported auditApi.list. [apps/web/app/(admin)/admin/audit/page.tsx:AuditDashboardPage]

## Invariants

- List query enabled only for isAdmin; ready non-admin renders null and unready guard renders spinner. [apps/web/app/(admin)/admin/audit/page.tsx:AuditDashboardPage]
- Both filter values are debounced by 250 ms and empty values become undefined in list request. [apps/web/app/(admin)/admin/audit/page.tsx:AuditDashboardPage]

## Side Effects

- Runs auditApi.list with debounced filters through React Query; imported API requests /admin/audit-events [apps/web/lib/api/audit.ts:auditApi]. [apps/web/app/(admin)/admin/audit/page.tsx:AuditDashboardPage]
- Invokes imported useAdminGuard [apps/web/hooks/use-admin-guard.ts:useAdminGuard]. [apps/web/app/(admin)/admin/audit/page.tsx:AuditDashboardPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
