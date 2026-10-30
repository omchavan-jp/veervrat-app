# blog

## Overview

Rich text blog creation and editing UI.

## Interface

- Exports BlogEditor with optional existing Blog [blog-editor.tsx:BlogEditor].

## Invariants

- Save and publish require nonblank title and disable while mutation pending; new publication creates then updates draft status [blog-editor.tsx:BlogEditor].

## Side Effects

- Uploads images, creates or updates blogs, invalidates blog queries, shows toasts and navigates after successful save or publish [blog-editor.tsx:BlogEditor].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
