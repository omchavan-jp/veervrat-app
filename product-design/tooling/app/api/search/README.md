# search

## Overview

Static Fumadocs search endpoint. [route.ts:GET]

## Interface

- Exports createFromSource(source).staticGET as GET for static search data. [route.ts:GET]

## Invariants

- Rendering is force-static. [route.ts:dynamic]

## Side Effects

- Builds search response from documentation source. [route.ts:GET]

## Verification

From `product-design/tooling`, run `pnpm validate` to check governance and D2 sources. This was not run during documentation generation.
