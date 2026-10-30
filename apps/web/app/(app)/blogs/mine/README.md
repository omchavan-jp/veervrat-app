# mine

## Overview

Lists the current author’s blogs with draft badges, updated dates and editor links [apps/web/app/(app)/blogs/mine/page.tsx:MyBlogsPage].

## Interface

- Default export MyBlogsPage includes create links to /blogs/new and edit links to /blogs/id/edit [apps/web/app/(app)/blogs/mine/page.tsx:MyBlogsPage].

## Invariants

- Blog title links select editor for drafts and /community/blogs/id for published entries [apps/web/app/(app)/blogs/mine/page.tsx:MyBlogsPage].

## Side Effects

- Queries blogsApi.listMine with queryKeys.blogs.mine; error retry calls refetch [apps/web/app/(app)/blogs/mine/page.tsx:MyBlogsPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
