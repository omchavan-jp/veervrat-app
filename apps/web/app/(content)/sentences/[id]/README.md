# [id]

## Overview

Sentence information with ancestry, active-journey indicator and study CTA. [apps/web/app/(content)/sentences/[id]/page.tsx:SentenceInfoPage]

## Interface

- Default SentenceInfoPage accepts promised id params and invokes virtuesApi.getSentence. [apps/web/app/(content)/sentences/[id]/page.tsx:SentenceInfoPage]

## Invariants

- Authenticated CTA links to /study; guests receive login link. This component contains no journey-start mutation. [apps/web/app/(content)/sentences/[id]/page.tsx:SentenceInfoPage]

## Side Effects

- Queries sentence detail. [apps/web/app/(content)/sentences/[id]/page.tsx:SentenceInfoPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
