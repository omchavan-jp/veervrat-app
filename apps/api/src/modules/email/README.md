# email

## Overview

Global email module renders React templates and delivers messages via SMTP, with a Redis-backed BullMQ queue and an in-process worker when Redis is configured. [email.module.ts:EmailModule] [email.service.ts:EmailService] [email-queue.service.ts:EmailQueueService]

## Interface

- EmailModule exports EmailService and EmailQueueService; renderTemplate returns HTML and plain text; queue provides transactional and notification sends. [email.module.ts:EmailModule] [email.service.ts:renderTemplate] [email-queue.service.ts:sendTransactional] [email-queue.service.ts:sendNotification]
- [templates](./templates/README.md): Bilingual React email templates cover account actions, exports, invitations and notifications.

## Invariants

- With Redis, the queue uses cluster-compatible {email} prefix, concurrency five, three exponential-backoff attempts, and retains up to 100 completed and 500 failed jobs; without Redis it sends inline. [email-queue.service.ts:onModuleInit] [email-queue.service.ts:enqueue] [email-queue.service.ts:JOB_OPTIONS]
- Transactional enqueue failures propagate; notification failures are logged and swallowed. Worker errors are rate-limited to one log per minute. [email-queue.service.ts:sendTransactional] [email-queue.service.ts:sendNotification] [email-queue.service.ts:logWorkerError]
- Non-production or missing SMTP host selects console mode; production SMTP defaults to port 587 and requires TLS unless implicit TLS is enabled. [email.service.ts:EmailService]

## Side Effects

- Creates and closes BullMQ queue and worker, connects to Redis, delivers queued jobs and logs failures; in-process retries depend on a running replica. [email-queue.service.ts:onModuleInit] [email-queue.service.ts:onModuleDestroy]
- SMTP sends mail or logs email text in development; rendering produces HTML and plain text. [email.service.ts:deliver] [email.service.ts:renderTemplate]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
