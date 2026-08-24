import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import type { StorageProvider } from './storage-provider';

export type AzureBlobStorageConfig = {
  accountName: string;
  containerName: string;
  /** The user-assigned managed identity's client id — DefaultAzureCredential needs this to pick
   *  the right identity when a Container App has exactly one attached, since IMDS does not
   *  disambiguate on its own. */
  managedIdentityClientId: string;
};

/**
 * Azure Blob Storage, reached with the api's existing managed identity (O15) — no access key
 * lives anywhere, on this SDK's own account.
 *
 * Blob has no equivalent of an S3 presigned-URL helper when authenticating via a managed
 * identity: SAS generation needs an account key or a **user delegation key**, which itself has
 * to be requested from the service with an identity that can generate one (`Storage Blob
 * Delegator`, granted alongside `Storage Blob Data Contributor`). `signedUrl` does that request
 * on every call rather than caching the delegation key, since a cached key that outlives its own
 * validity window would silently mint URLs an attacker could still use after the intended
 * expiry — the exact failure a short-lived signed URL exists to prevent.
 */
export class AzureBlobStorageProvider implements StorageProvider {
  private readonly service: BlobServiceClient;
  private readonly containerName: string;

  constructor(config: AzureBlobStorageConfig) {
    this.containerName = config.containerName;
    this.service = new BlobServiceClient(
      `https://${config.accountName}.blob.core.windows.net`,
      new DefaultAzureCredential({ managedIdentityClientId: config.managedIdentityClientId }),
    );
  }

  private blockBlob(key: string) {
    return this.service.getContainerClient(this.containerName).getBlockBlobClient(key);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    const blob = this.blockBlob(key);
    await blob.uploadData(body, { blobHTTPHeaders: { blobContentType: contentType } });
    return { url: blob.url };
  }

  async get(key: string): Promise<Buffer> {
    const blob = this.blockBlob(key);
    const download = await blob.downloadToBuffer();
    return download;
  }

  async delete(key: string): Promise<void> {
    // Idempotent: an avatar's delete path (#140) must not fail because the file was already
    // removed, or because it never existed in the first place.
    await this.blockBlob(key).deleteIfExists();
  }

  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const blob = this.blockBlob(key);
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInSeconds * 1000);

    const delegationKey = await this.service.getUserDelegationKey(startsOn, expiresOn);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: key,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
      },
      delegationKey,
      this.service.accountName,
    );

    return `${blob.url}?${sas.toString()}`;
  }
}
