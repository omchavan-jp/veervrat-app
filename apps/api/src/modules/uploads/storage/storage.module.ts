import { Module } from '@nestjs/common';
import { storageProviderFactory } from './storage-provider.factory';
import { STORAGE_PROVIDER } from './storage-provider';

/**
 * The object store, as one instance shared by everything that needs it.
 *
 * `uploads` used to provide the factory privately, which was fine while it was the only
 * consumer. `content-overrides` is the second, and giving it its own copy of the factory would
 * build a second `BlobServiceClient` — a second managed-identity token cache, a second
 * connection pool, and two places to look when storage misbehaves.
 *
 * It lives under `uploads/storage/` because that is where the provider implementations already
 * are, and moving them would touch every import for no behavioural gain. The name is now
 * narrower than the thing: this is the application's storage seam, not the uploads feature's.
 */
@Module({
  providers: [storageProviderFactory],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
