# blogs

## Overview

Blog publication, search and comment moderation combine REST handlers, service authorization and Prisma persistence. [blogs.controller.ts:BlogsController] [blogs.service.ts:BlogsService] [blogs.repository.ts:BlogsRepository]

## Interface

- Optional-session GET blogs, blogs/search and blogs/:id; session GET blogs/mine, POST blogs, PATCH/DELETE blogs/:id. [blogs.controller.ts:BlogsController]
- Session POST blogs/:id/comments, DELETE blogs/:id/comments/:cid and POST blogs/:id/comments/:cid/hide or /report; exports BlogsController, BlogsService, BlogsRepository and BlogsModule classes. [blogs.controller.ts:BlogsController] [blogs.service.ts:BlogsService] [blogs.repository.ts:BlogsRepository] [blogs.module.ts:BlogsModule]
- [dto](./dto/README.md): Validation contracts define blog and comment request bodies.

## Invariants

- Create/edit/delete and comment create/delete/hide/report invoke hasPermission with platform or author context; comments must belong to the specified existing blog, additions require a published blog, and duplicate reports return without another notification. [blogs.service.ts:create] [blogs.service.ts:update] [blogs.service.ts:remove] [blogs.service.ts:loadCommentContext] [blogs.service.ts:reportComment]
- Drafts are visible only to their author; deleted blogs/comments are excluded and hidden comments are visible only to their author; lists use 20-item cursors and search trims queries and returns empty below two characters. [blogs.service.ts:getOne] [blogs.repository.ts:listComments] [blogs.repository.ts:findPublishedList] [blogs.repository.ts:findOwnList] [blogs.service.ts:search]
- Rich text is sanitized on create/body update; transition from draft to published sets publishedAt. [blogs.service.ts:sanitize] [blogs.service.ts:update]

## Side Effects

- Prisma reads/writes blogs and comments, soft deletion timestamps, hiding/report metadata and moderator role reads. [blogs.repository.ts:BlogsRepository]
- Invokes search maintenance on initialization and mutations, but BlogsIndexService maintenance is currently a no-op. Searches of at least two characters reject with HTTP 501; shorter queries return empty. [blogs.service.ts:onModuleInit] [blogs.service.ts:syncIndex] [blogs.service.ts:search] [../search/blogs-index.service.ts:BlogsIndexService]
- Creates new-comment notifications for other authors and report notifications for moderators; delete/hide decorators attach audit action, comment id and blog_id metadata. [blogs.service.ts:addComment] [blogs.service.ts:reportComment] [blogs.controller.ts:deleteComment] [blogs.controller.ts:hideComment]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
