# guidance

## Overview

Guidance actions and statuses UI [page.tsx:VmGuidancePage]

## Interface

- Default VmGuidancePage [page.tsx:VmGuidancePage]

## Invariants

- Empty sections are hidden and pending state is checked per item [page.tsx:SectionShell] [page.tsx:VmGuidancePage]
- Return note is collected and passed to mutation, but revisit API call does not forward it [page.tsx:ClosureCard] [page.tsx:VmGuidancePage]

## Side Effects

- Fetches VM actions; approves or revisits ERCs and approves journeys; invalidates actions on success and toasts on error [page.tsx:VmGuidancePage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
