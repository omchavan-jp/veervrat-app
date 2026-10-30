# decision-registry.schema.json

## Overview

Static governance JSON route. [route.ts:GET]

## Interface

- GET returns governanceJson for decision-registry.schema.json. [route.ts:GET]

## Invariants

- Node runtime and force-static rendering are configured. [route.ts:runtime] [route.ts:dynamic]

## Side Effects

- Reads governance data through governanceJson. [route.ts:GET]

## Verification

From `product-design/tooling`, run `pnpm validate` to check governance and D2 sources. This was not run during documentation generation.
