# Veervrat repository blueprint

## System Overview

This repository contains the Veervrat web and API applications, supporting infrastructure and a separate product-design workspace.

## Local Interface & Invariants

- Playwright configures Chromium end-to-end tests with global setup and teardown, one worker, and CI-sensitive retries and server startup. [playwright.config.ts:projects] [playwright.config.ts:globalSetup] [playwright.config.ts:workers] [playwright.config.ts:webServer]
- Running those tests starts configured web and API processes and writes test results and reports. [playwright.config.ts:webServer] [playwright.config.ts:outputDir] [playwright.config.ts:reporter]
- E2E setup creates or reuses shared test accounts, directly grants admin/moderator roles, and teardown attempts to delete ephemeral `@e2e.local` accounts and dependent data. It mutates the configured database; teardown is best-effort. [e2e/helpers/global-setup.ts:globalSetup] [e2e/helpers/global-teardown.ts:globalTeardown]

## Subdirectories & System Boundaries

- [Applications](./apps/README.md): API, web and backup components.
- [Infrastructure](./infra/README.md): Terraform configuration and operating guidance.
- [Packages](./packages/README.md): shared TypeScript types.
- [Product design](./product-design/README.md): canonical redesign documents and their tooling.
- [Scripts](./scripts/README.md): audits, backup operations and Git work reports.

## Global Invariants

- The pnpm workspace includes `apps/*` and `packages/*`; product-design tooling has its own package configuration. [pnpm-workspace.yaml:packages] [product-design/tooling/package.json:packageManager]

## Global Side Effects

- Application and infrastructure components interact with external services and persistent data; consult their contracts before running operations.

## System Verification

From the repository root, `pnpm test` runs the workspace test task; `pnpm test:e2e` runs Playwright separately. Neither was run during this documentation bootstrap. Product-design tooling has separate checks documented in its [README](./product-design/tooling/README.md).
