# edit

## Overview

Loads a blog and delegates editing to BlogEditor [apps/web/app/(app)/blogs/[id]/edit/page.tsx:EditBlogPage].

## Interface

- Default EditBlogPage accepts params Promise with id; supplies retrieved data as BlogEditor existing [apps/web/app/(app)/blogs/[id]/edit/page.tsx:EditBlogPage].

## Invariants

- Editor renders only after loading ends and data exists without query error; missing/error state links to /blogs/mine [apps/web/app/(app)/blogs/[id]/edit/page.tsx:EditBlogPage].

## Side Effects

- Queries blogsApi.getOne(id) with queryKeys.blogs.detail(id) [apps/web/app/(app)/blogs/[id]/edit/page.tsx:EditBlogPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
