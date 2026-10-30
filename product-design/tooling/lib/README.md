# lib

## Overview

Documentation source loader and governance JSON response helper. [source.ts:source] [governance-json.ts:governanceJson]

## Interface

- source loads content/docs at base URL /; governanceJson accepts a filename. [source.ts:source] [governance-json.ts:governanceJson]

## Invariants

- Successful JSON responses specify private, no-store; any file-read failure returns a plain-text 404, including failures other than a missing file. [governance-json.ts:governanceJson]

## Side Effects

- Reads files from sibling 00-governance directory. [governance-json.ts:governanceJson]

## Verification

From `product-design/tooling`, run `pnpm validate` to check governance and D2 sources. This was not run during documentation generation.
