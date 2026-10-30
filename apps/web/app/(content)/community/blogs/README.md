# blogs

## Overview

Blog listing and debounced search UI. [apps/web/app/(content)/community/blogs/page.tsx:CommunityBlogsPage]

## Interface

- Default CommunityBlogsPage uses blogsApi.list/search; local BlogCard accepts Blog and links to its detail. [apps/web/app/(content)/community/blogs/page.tsx:CommunityBlogsPage] [apps/web/app/(content)/community/blogs/page.tsx:BlogCard]
- [\[id\]](./%5Bid%5D/README.md): Blog reader with comment submission and moderation controls. [apps/web/app/(content)/community/blogs/[id]/page.tsx:BlogDetailPage]

## Invariants

- Search activates after a 250 ms debounce when trimmed input has at least two characters; list query is disabled during search, and load-more appears only outside search. [apps/web/app/(content)/community/blogs/page.tsx:CommunityBlogsPage]

## Side Effects

- Invokes list/search queries and fetchNextPage on load-more. [apps/web/app/(content)/community/blogs/page.tsx:CommunityBlogsPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
