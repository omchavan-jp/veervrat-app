# content-editor

## Overview

Pure message catalog lookup, override and placeholder helpers for the content editor.

## Interface

- Exports [disambiguate.ts:disambiguateKeys], [icu.ts:extractPlaceholders], [icu.ts:placeholdersEqual], [messages.ts:NestedMessages], [messages.ts:flattenMessages], [messages.ts:buildValueIndex], [messages.ts:findKeysByText], and [messages.ts:applyOverrides].

## Invariants

- Disambiguation falls back to all original keys if context filtering would remove every match [disambiguate.ts:disambiguateKeys].
- Placeholder extraction returns sorted unique argument names; equality compares these sets [icu.ts:extractPlaceholders] [icu.ts:placeholdersEqual].
- Reverse lookup trims values and skips blanks; overrides deep-copy the base before applying dotted paths [messages.ts:buildValueIndex] [messages.ts:applyOverrides].

## Side Effects

- No explicit side effects identified.

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
