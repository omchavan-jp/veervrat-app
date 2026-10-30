# dto

## Overview

Image upload DTO validates JSON request fields. [upload-image.dto.ts:UploadImageDto]

## Interface

- Accepts base64 fileBuffer, filename, mimeType and optional roomId. [upload-image.dto.ts:UploadImageDto]

## Invariants

- String fields are required, filename and mimeType have a 255-character maximum, and roomId must be a UUID when supplied. [upload-image.dto.ts:UploadImageDto]

## Side Effects

- Defines request validation metadata. [upload-image.dto.ts:UploadImageDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
