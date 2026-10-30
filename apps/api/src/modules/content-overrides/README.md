# content-overrides

## Overview

Stages localized copy edits in private object storage and publishes merged catalogs as a GitHub pull request. [content-overrides.service.ts:ContentOverridesService] [content-overrides.repository.ts:ContentOverridesRepository] [github-publisher.ts:GithubPublisher]

## Interface

- Session GET, PATCH and DELETE content-overrides and POST content-overrides/publish; writes are throttled and audited. [content-overrides.controller.ts:ContentOverridesController]
- Exports ContentOverridesModule, repository types, GithubPublisher, placeholder and message utilities. [content-overrides.module.ts:ContentOverridesModule] [content-overrides.repository.ts:OverrideEntry] [github-publisher.ts:GithubPublisher] [icu-placeholders.ts:placeholdersEqual] [messages.util.ts:applyOverrides]
- [dto](./dto/README.md): Validation contracts constrain staged message keys, locales and values.

## Invariants

- Every service operation checks feature enabled and content.edit permission with current grants and feature mode; disabled returns 404. [content-overrides.service.ts:ensureEnabled] [content-overrides.service.ts:assertEditor]
- Upsert compares ICU argument sets with the client base; publish rechecks placeholders for keys present in canonical catalogs, accepts new keys, rejects empty staging and an unconfigured publisher, and creates a new branch. Placeholder extraction is regex-based rather than a full ICU parser. [content-overrides.service.ts:upsert] [content-overrides.service.ts:publish] [icu-placeholders.ts:extractPlaceholders] [github-publisher.ts:openPullRequest]
- Missing or empty locale blobs read as empty; legacy strings normalize to attribution defaults; writes sort keys. applyOverrides copies the catalog and can create intermediate objects. [content-overrides.repository.ts:readLocale] [content-overrides.repository.ts:normalizeEntry] [content-overrides.repository.ts:writeLocale] [messages.util.ts:applyOverrides]

## Side Effects

- Reads and writes private per-locale JSON blobs through StorageProvider, logging and translating storage errors. [content-overrides.repository.ts:readLocale] [content-overrides.repository.ts:writeLocale]
- Reads GitHub base catalogs and creates tree, commit, branch and pull request via authenticated REST calls; logs GitHub failures. Publishing leaves staged blobs intact. [github-publisher.ts:getMessageFiles] [github-publisher.ts:openPullRequest] [github-publisher.ts:gh] [content-overrides.service.ts:publish]
- Mutation routes attach audit metadata and throttling. [content-overrides.controller.ts:upsert] [content-overrides.controller.ts:discard] [content-overrides.controller.ts:publish]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
