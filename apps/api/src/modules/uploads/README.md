# uploads

## Overview

Image processing, rich-text upload reference extraction and guest-reachable image resolution support uploads. [image-pipeline.ts:processUploadedImage] [upload-references.ts:extractUploadKeys] [uploads-resolver.controller.ts:UploadsResolverController]

## Interface

- processUploadedImage returns processed bytes, content type, extension and dimensions; extractUploadKeys returns unique keys in rich-text src fields. [image-pipeline.ts:processUploadedImage] [upload-references.ts:extractUploadKeys]
- GET uploads/:key delegates authorization and resolution to the resolver, redirecting public images or streaming private images. [uploads-resolver.controller.ts:serve]
- Session-protected chat, experience and blog upload endpoints return stable application URLs; UploadsService also binds images in saved experience bodies. [uploads.controller.ts:UploadsController] [uploads.service.ts:bindToExperienceLog]
- Resolver redirects blog objects to public URLs and streams authorized chat and experience objects. [uploads-resolver.service.ts:resolve]
- [dto](./dto/README.md): Image upload DTO validates JSON request fields.
- [storage](./storage/README.md): A shared object-storage interface selects Azure Blob or S3-compatible storage based on configuration.

## Invariants

- Readable JPEG, PNG, WebP and GIF are accepted; orientation is applied, metadata stripped, longest edge limited to 2048 without enlargement and animation preserved. [image-pipeline.ts:processUploadedImage]
- Reference extraction accepts route-ending upload URLs and deduplicates keys. Streamed responses use private caching, nosniff, restrictive CSP and same-site CORP. [upload-references.ts:extractUploadKeys] [uploads-resolver.controller.ts:serve]
- Decoded input is limited to 10 MB, processed as an image with HEIC conversion fallback, and assigned a random key; blog objects are public while chat and experience objects are private. [uploads.service.ts:uploadImage]
- Chat resolution requires room participation; experience resolution delegates to log visibility, or restricts unbound images to the uploader; absent or unauthorized uploads return not found. [uploads-resolver.service.ts:resolve] [uploads-resolver.service.ts:assertChatParticipant] [uploads-resolver.service.ts:assertMayViewExperienceImage]
- Chat upload stores the supplied roomId without checking participation or an active relationship; resolution checks only whether the caller ID appears after the room prefix, without rechecking an active relationship. [uploads.service.ts:uploadChatImage] [uploads.service.ts:uploadImage] [uploads-resolver.service.ts:assertChatParticipant]
- Experience binding and unbinding are scoped to uploader and run in a transaction. [uploads.repository.ts:bindToExperienceLog]

## Side Effects

- Processes image bytes with sharp and emits redirects or image responses. [image-pipeline.ts:processUploadedImage] [uploads-resolver.controller.ts:serve]
- Writes image objects and Prisma upload records; storage failures become service unavailable. [uploads.service.ts:uploadImage] [uploads.repository.ts:createUploadRecord]
- Reads upload records and private object bytes and updates log bindings. [uploads-resolver.service.ts:resolve] [uploads.repository.ts:bindToExperienceLog]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
