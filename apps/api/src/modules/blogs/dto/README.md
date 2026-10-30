# dto

## Overview

Validation contracts define blog and comment request bodies. [create-blog.dto.ts:CreateBlogDto] [create-comment.dto.ts:CreateCommentDto] [update-blog.dto.ts:UpdateBlogDto]

## Interface

- Exports CreateBlogDto, UpdateBlogDto and CreateCommentDto. [create-blog.dto.ts:CreateBlogDto] [update-blog.dto.ts:UpdateBlogDto] [create-comment.dto.ts:CreateCommentDto]

## Invariants

- Create title is a string of 1–200 characters with object body; update title/body/isDraft are optional with the same title bounds, object body and boolean isDraft. [create-blog.dto.ts:CreateBlogDto] [update-blog.dto.ts:UpdateBlogDto]
- Comment body is a string of 1–2000 characters. [create-comment.dto.ts:CreateCommentDto]

## Side Effects

- class-validator decorators register request validation metadata. [create-blog.dto.ts:CreateBlogDto] [create-comment.dto.ts:CreateCommentDto] [update-blog.dto.ts:UpdateBlogDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
