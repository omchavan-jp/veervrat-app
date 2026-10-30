# i18n

## Overview

Server request locale and translated message resolution.

## Interface

- Default next-intl request configuration resolves supported locale from X-Next-Locale and dynamically loads its message catalog [request.ts:getRequestConfig].

## Invariants

- Unsupported or missing locale falls back to en; staged overrides apply only when CONTENT_EDIT_ENABLED is true, editor cookie and session are present, and fetch succeeds [request.ts:CONTENT_EDIT] [request.ts:fetchOverrides].

## Side Effects

- Reads request headers and cookies and may fetch staged content without caching from API_ORIGIN [request.ts:fetchOverrides].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
