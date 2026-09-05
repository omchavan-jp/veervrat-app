import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import type { StorageProvider, StorageVisibility } from './storage-provider';

export type AzureBlobStorageConfig = {
  accountName: string;
  /** Container for private objects — refuses anonymous reads. */
  containerName: string;
  /** Container for published objects — blob-level anonymous read. */
  publicContainerName: string;
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
  private readonly publicContainerName: string;

  constructor(config: AzureBlobStorageConfig) {
    this.containerName = config.containerName;
    this.publicContainerName = config.publicContainerName;
    this.service = new BlobServiceClient(
      `https://${config.accountName}.blob.core.windows.net`,
      new DefaultAzureCredential({ managedIdentityClientId: config.managedIdentityClientId }),
    );
  }

  private container(visibility: StorageVisibility): string {
    return visibility === 'public' ? this.publicContainerName : this.containerName;
  }

  private blockBlob(key: string, visibility: StorageVisibility) {
    return this.service.getContainerClient(this.container(visibility)).getBlockBlobClient(key);
  }

  async put(
    key: string,
    body: Buffer,
    contentType: string,
    visibility: StorageVisibility,
  ): Promise<{ url: string }> {
    const blob = this.blockBlob(key, visibility);
    await blob.uploadData(body, { blobHTTPHeaders: { blobContentType: contentType } });
    return { url: blob.url };
  }

  async get(key: string, visibility: StorageVisibility): Promise<Buffer> {
    const blob = this.blockBlob(key, visibility);
    const download = await blob.downloadToBuffer();
    return download;
  }

  async getOrNull(key: string, visibility: StorageVisibility): Promise<Buffer | null> {
    try {
      return await this.get(key, visibility);
    } catch (err) {
      if (isBlobNotFound(err)) return null;
      throw err;
    }
  }

  async delete(key: string, visibility: StorageVisibility): Promise<void> {
    // Idempotent: an avatar's delete path (#140) must not fail because the file was already
    // removed, or because it never existed in the first place.
    await this.blockBlob(key, visibility).deleteIfExists();
  }

  publicUrl(key: string): string {
    return this.blockBlob(key, 'public').url;
  }

  // Private container only: signing a public object would defeat the caching that is the whole
  // reason `blog` uploads are public.
  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const blob = this.blockBlob(key, 'private');
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

/**
 * Whether an Azure Blob error means "nothing is stored there", as opposed to a real failure.
 *
 * Deliberately NOT the same check as the S3 provider's. Azure's SDK raises a `RestError` whose
 * status lives on `statusCode` and whose reason lives on `code` — it has neither `name:
 * 'NoSuchKey'` nor `$metadata.httpStatusCode`. A single shared helper written against one SDK
 * would return false for the other and turn "nothing written yet" into "storage failed", which
 * is the bug `getOrNull` exists to make impossible.
 *
 * `code` is checked as well as the status because a 404 can also mean the *container* is
 * missing (`ContainerNotFound`) — a configuration fault that must keep surfacing as an error
 * rather than being read as an empty object.
 */
function isBlobNotFound(err: unknown): boolean {
  const e = err as { statusCode?: number; code?: string };
  return e?.code === 'BlobNotFound' || (e?.statusCode === 404 && e?.code !== 'ContainerNotFound');
}
