# my-vratarthis

## Overview

Lists relationships with profile links [my-vratarthis-client.tsx:MyVratarthisClient]

## Interface

- Exports MyVratarthisClient; default MyVratarthisPage and metadata title [my-vratarthis-client.tsx:MyVratarthisClient] [page.tsx:MyVratarthisPage] [page.tsx:metadata]

## Invariants

- Query uses 30-second stale time and displays loading, error and empty states [my-vratarthis-client.tsx:MyVratarthisClient]

## Side Effects

- Queries vmRelationshipsApi.getMyVratarthis [my-vratarthis-client.tsx:MyVratarthisClient]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
