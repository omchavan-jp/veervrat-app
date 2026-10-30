# feedback

## Overview

Session-protected feedback supports reporting, listing, voting and administrative status management. [feedback.controller.ts:FeedbackController] [feedback.service.ts:FeedbackService]

## Interface

- Create and upvote routes are throttled; status updates are audited. [feedback.controller.ts:create] [feedback.controller.ts:toggleUpvote] [feedback.controller.ts:updateStatus]
- Module registers feedback controller, service and repository with authentication. [feedback.module.ts:FeedbackModule]
- [dto](./dto/README.md): Feedback DTOs validate reporting, pagination and status changes.

## Invariants

- Create, read and upvote permissions incorporate capability grants and feature mode; management uses platform permission. Reporter identity and role come from the session. [feedback.service.ts:allowed] [feedback.service.ts:create] [feedback.service.ts:updateStatus]
- Default list includes NEW and TRIAGED, uses descending createdAt/id cursor ordering and caps page size at 100. [feedback.repository.ts:list]
- Status-specific notes are retained only for DECLINED or DONE respectively. [feedback.service.ts:updateStatus]

## Side Effects

- Prisma creates feedback, toggles upvotes and updates status; status updates carry audit metadata. [feedback.repository.ts:create] [feedback.repository.ts:toggleUpvote] [feedback.repository.ts:updateStatus] [feedback.controller.ts:updateStatus]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
