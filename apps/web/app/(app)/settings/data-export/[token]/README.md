# [token]

## Overview

Client page that fetches a token-specific data export and triggers a browser file download. [apps/web/app/(app)/settings/data-export/[token]/page.tsx:DataExportDownloadPage]

## Interface

- Default export DataExportDownloadPage reads token from useParams and displays download progress or an error with /settings link. [apps/web/app/(app)/settings/data-export/[token]/page.tsx:DataExportDownloadPage]

## Invariants

- The started state guards repeated effect execution; non-OK responses and fetch failures select error UI. Download filename uses Content-Disposition filename when matched, otherwise veervrat-export.json. [apps/web/app/(app)/settings/data-export/[token]/page.tsx:DataExportDownloadPage]

## Side Effects

- The effect fetches ${getRuntimeConfig().apiBaseUrl}/users/data-export/${token} with credentials included, converts the response to a Blob, creates/clicks an anchor using an object URL, then revokes that URL. [apps/web/app/(app)/settings/data-export/[token]/page.tsx:DataExportDownloadPage] [apps/web/lib/runtime-config.ts:getRuntimeConfig]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
