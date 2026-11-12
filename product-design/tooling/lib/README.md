# lib

## Overview

Documentation source loader, source-relative link resolver, and governance JSON response helper. [source.ts:source] [document-href.ts:documentHref] [governance-json.ts:governanceJson]

## Interface

- source loads content/docs at base URL /; governanceJson accepts a filename. [source.ts:source] [governance-json.ts:governanceJson]
- documentHref resolves explicit `./` and `../` MDX links from the source-document URL into `/product-docs` links. It removes `.mdx` for page routes and preserves file extensions, queries, and fragments; the exported page's trailing slash does not change the result. Other hrefs are unchanged. [document-href.ts:documentHref]

## Invariants

- Successful JSON responses specify private, no-store; any file-read failure returns a plain-text 404, including failures other than a missing file. [governance-json.ts:governanceJson]

## Side Effects

- Reads files from sibling 00-governance directory. [governance-json.ts:governanceJson]

## Verification

Run `node --test scripts/governance.test.mjs` from `product-design/tooling` for the source-relative link regressions (also run by CI), including registry/schema links under both URL forms and unchanged MDX/external link behavior.

From `product-design/tooling`, run `pnpm validate` to check governance and D2 sources. This was not run during documentation generation.
