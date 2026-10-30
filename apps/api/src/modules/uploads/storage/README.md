# storage

## Overview

A shared object-storage interface selects Azure Blob or S3-compatible storage based on configuration. [storage-provider.ts:StorageProvider] [storage-provider.factory.ts:storageProviderFactory] [storage.module.ts:StorageModule]

## Interface

- Providers expose put, get, getOrNull, delete, private signed URLs and public URLs with explicit object visibility. [storage-provider.ts:StorageProvider]
- StorageModule exports the injected storage provider. [storage.module.ts:StorageModule]

## Invariants

- Fully configured Azure and S3 backends together cause startup failure; neither configured produces a provider that refuses operations. Public containers or buckets default to private name plus -public. [storage-provider.factory.ts:storageProviderFactory]
- getOrNull translates object absence to null while propagating other errors; Azure distinguishes a missing container. [azure-blob-storage.provider.ts:isBlobNotFound] [s3-storage.provider.ts:isNoSuchKey]

## Side Effects

- Writes, reads and deletes objects using Azure Blob or S3; private signed URLs use Azure delegation keys or S3 presigning. [azure-blob-storage.provider.ts:AzureBlobStorageProvider] [s3-storage.provider.ts:S3StorageProvider]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
