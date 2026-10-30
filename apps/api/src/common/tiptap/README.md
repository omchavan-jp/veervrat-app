# tiptap

## Overview

Sanitizes Tiptap JSON documents and extracts plain text [sanitize.ts:sanitizeTiptapDoc] [sanitize.ts:tiptapToPlainText].

## Interface

- Exports TiptapNode/TiptapMark/TiptapDoc shapes, InvalidTiptapContentError, sanitizeTiptapDoc and tiptapToPlainText [sanitize.ts:TiptapNode] [sanitize.ts:TiptapMark] [sanitize.ts:TiptapDoc] [sanitize.ts:InvalidTiptapContentError] [sanitize.ts:sanitizeTiptapDoc] [sanitize.ts:tiptapToPlainText].

## Invariants

- Sanitization requires a doc root with at least one surviving child and builds an allowlisted copy with HTTP(S) image/link URLs [sanitize.ts:sanitizeTiptapDoc].
- Headings normalize to levels 2–4, mentions require allowed entity types and 1–64 character IDs, and labels truncate to 120 characters [sanitize.ts:sanitizeTiptapDoc].
- Plain text concatenates descendant text nodes with normalized whitespace [sanitize.ts:tiptapToPlainText].

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
