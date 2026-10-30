# API domain modules

## Overview

Architectural index of the immediate source subdirectories documented below.

## Interface

- [actions](./actions/README.md): Session-guarded action queue aggregation for owned journeys and assigned journey guidance.
- [admin](./admin/README.md): Admin content module registers taxonomy, shloka scheduling/queue, pothi section and resource controllers, services and a shared repository.
- [admin-users](./admin-users/README.md): AdminUsersModule wires account administration with AuthModule, JourneysModule and UsersModule.
- [audit](./audit/README.md): Audit event persistence, listing and handler metadata capture, with a global module importing AuthModule and exporting AuditService.
- [auth](./auth/README.md): Authentication HTTP flows and persistence, with Passport, email, session guards and signup expiry cleanup. AuthModule exports AuthService, SessionGuard and OptionalSessionGuard.
- [blogs](./blogs/README.md): Blog publication, search and comment moderation combine REST handlers, service authorization and Prisma persistence.
- [capabilities](./capabilities/README.md): Resolves persisted capability grants and environment feature modes.
- [chats](./chats/README.md): Authenticated chat history and Socket.IO delivery use relationship-scoped room authorization.
- [cms](./cms/README.md): Bilingual CMS pages expose public lookup and authorized management by stable key.
- [content](./content/README.md): Public content reads expose pothi sections, shlokas, daily selection and resources.
- [content-overrides](./content-overrides/README.md): Stages localized copy edits in private object storage and publishes merged catalogs as a GitHub pull request.
- [content-suggestions](./content-suggestions/README.md): Authenticated users with capability submit and retrieve their content suggestions; authorized triagers list and update them.
- [dashboard](./dashboard/README.md): Authenticated VA dashboard aggregates journey and test statistics and recommends sentences from low-scoring answers.
- [data-export](./data-export/README.md): DataExportModule registers export service and repository and exposes the service.
- [email](./email/README.md): Global email module renders React templates and delivers messages via SMTP, with a Redis-backed BullMQ queue and an in-process worker when configured.
- [entity-search](./entity-search/README.md): Authenticated entity-reference autocomplete searches shared taxonomy and a user’s own journey content.
- [erc](./erc/README.md): Journey exposures, resolutions and challenges have session-protected endpoints and Prisma persistence for pool selections, custom items, reviews and mentor sidenotes.
- [experience-logs](./experience-logs/README.md): Experience logs support sanitized rich-text drafts, publishing, visibility, tags and public discovery.
- [feedback](./feedback/README.md): Session-protected feedback supports reporting, listing, voting and administrative status management.
- [follows](./follows/README.md): Session-protected follow controller delegates user follow and unfollow actions.
- [invitations](./invitations/README.md): Invitations support platform signup and global or journey mentorship, with public token display and authenticated decisions.
- [journeys](./journeys/README.md): Journeys support creation, activity, state and completion workflows, plus scheduled dormant detection.
- [moderation](./moderation/README.md): Display-content controller exposes audited feature toggles.
- [notifications](./notifications/README.md): Notifications persist recipient events, expose inbox operations and optionally dispatch email.
- [search](./search/README.md): Global search module provides PostgreSQL user search, unavailable blog and shloka search stubs, and a Meilisearch wrapper.
- [stats](./stats/README.md): Guest-accessible platform statistics aggregate four counts with Redis caching.
- [tests](./tests/README.md): Manages weakness test drafts, answers, submission and reports.
- [uploads](./uploads/README.md): Image processing, rich-text upload reference extraction and guest-reachable image resolution support uploads.
- [users](./users/README.md): User endpoints and repository support profiles, settings, account operations and personal data export.
- [virtues](./virtues/README.md): Read-only catalog endpoints expose virtues, subvirtues and sentences.
- [vm-relationships](./vm-relationships/README.md): Manages global and journey-scoped vratmitra relationships and rosters.
- [weaknesses](./weaknesses/README.md): Guest-accessible weakness catalog adds personalized test and journey information when signed in.

## Invariants

- No additional local contract; see the child contracts above for component-specific behavior.

## Side Effects

- No additional local contract; see the child contracts above for component-specific behavior.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
