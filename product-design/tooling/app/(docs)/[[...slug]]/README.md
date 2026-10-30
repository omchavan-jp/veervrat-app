# [[...slug]]

## Overview

Static MDX documentation page renderer. [page.tsx:Page]

## Interface

- Page resolves slug, registers D2Diagram and rewrites relative MDX links; generateStaticParams supplies paths. [page.tsx:Page] [page.tsx:documentHref] [page.tsx:generateStaticParams]

## Invariants

- Unknown pages return notFound and dynamicParams is false. [page.tsx:Page] [page.tsx:dynamicParams]

## Side Effects

- Renders title, optional description, table of contents and MDX content. [page.tsx:Page]

## Verification

From `product-design/tooling`, run `pnpm validate` to check governance and D2 sources. This was not run during documentation generation.
