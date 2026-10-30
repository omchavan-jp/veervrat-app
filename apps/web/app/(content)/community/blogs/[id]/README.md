# [id]

## Overview

Blog reader with comment submission and moderation controls. [apps/web/app/(content)/community/blogs/[id]/page.tsx:BlogDetailPage]

## Interface

- Default BlogDetailPage accepts promised id params and renders blogsApi.getOne output through MessageContent. [apps/web/app/(content)/community/blogs/[id]/page.tsx:BlogDetailPage]

## Invariants

- Comment input/actions require authentication; blank trimmed comments cannot be submitted. Hide controls require blog author or MODERATOR/ADMIN role; delete also allows comment author; report excludes own comments. These are UI conditions. [apps/web/app/(content)/community/blogs/[id]/page.tsx:BlogDetailPage]

## Side Effects

- Queries blog detail; calls addComment/deleteComment/hideComment/reportComment mutations. Successful add clears input; add/delete/hide invalidate detail; report success and mutation errors show toasts. [apps/web/app/(content)/community/blogs/[id]/page.tsx:BlogDetailPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
