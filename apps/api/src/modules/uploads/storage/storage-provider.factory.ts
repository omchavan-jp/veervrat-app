import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER, type StorageProvider } from './storage-provider';
import { S3StorageProvider } from './s3-storage.provider';
import { AzureBlobStorageProvider } from './azure-blob-storage.provider';

const logger = new Logger('StorageProviderFactory');

/**
 * A provider that refuses every operation, with a clear reason.
 *
 * The state before #139 in every deployed environment: `S3_ENDPOINT` unset, `s3` null, every
 * upload throwing 503. Kept as an explicit implementation of the same interface — rather than a
 * null the service has to check for — so "storage is not configured" is one branch that behaves
 * identically everywhere the service calls it, instead of every call site needing its own guard.
 */
class UnconfiguredStorageProvider implements StorageProvider {
  // No `await` in any of these — they throw synchronously — so each is written as returning a
  // rejected promise rather than `async`, which avoids `@typescript-eslint/require-await` while
  // keeping the same interface contract every caller already awaits.
  put(): Promise<never> {
    return Promise.reject(new Error('File storage is not configured in this environment'));
  }
  get(): Promise<never> {
    return Promise.reject(new Error('File storage is not configured in this environment'));
  }
  delete(): Promise<never> {
    return Promise.reject(new Error('File storage is not configured in this environment'));
  }
  signedUrl(): Promise<never> {
    return Promise.reject(new Error('File storage is not configured in this environment'));
  }
}

/**
 * Picks the storage backend from whichever configuration is present — Azure Blob first, then
 * S3/MinIO, then unconfigured — rather than a separate `STORAGE_PROVIDER=azure|s3` toggle.
 *
 * One flag and one set of credentials can drift out of sync (the flag says azure, the Azure
 * vars are unset); detecting by presence means there is only one thing to get right per
 * environment. Local dev sets the S3/MinIO vars and nothing Azure-shaped; a deployed environment
 * sets the Azure vars and nothing S3-shaped, because there is no MinIO to point at there. Azure
 * is checked first only because it is the target of O15 — if both were ever present, that
 * ambiguity deserves the same loud failure a real deployment ambiguity would get elsewhere in
 * this codebase, not a silent pick.
 */
export const storageProviderFactory: Provider = {
  provide: STORAGE_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): StorageProvider => {
    const accountName = config.get<string>('AZURE_STORAGE_ACCOUNT_NAME');
    const containerName = config.get<string>('AZURE_STORAGE_CONTAINER_NAME');
    const managedIdentityClientId = config.get<string>('AZURE_CLIENT_ID');

    if (accountName && containerName && managedIdentityClientId) {
      logger.log(`Object storage: Azure Blob (${accountName}/${containerName})`);
      return new AzureBlobStorageProvider({ accountName, containerName, managedIdentityClientId });
    }

    const endpoint = config.get<string>('S3_ENDPOINT');
    const accessKeyId = config.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = config.get<string>('S3_SECRET_KEY');
    const bucket = config.get<string>('S3_BUCKET');
    const publicBase =
      config.get<string>('S3_PUBLIC_URL') ??
      (endpoint && bucket ? `${endpoint}/${bucket}` : undefined);

    if (endpoint && accessKeyId && secretAccessKey && bucket && publicBase) {
      logger.log(`Object storage: S3-compatible (${endpoint}/${bucket})`);
      return new S3StorageProvider({
        endpoint,
        region: config.get<string>('S3_REGION', 'us-east-1'),
        bucket,
        accessKeyId,
        secretAccessKey,
        publicBase,
      });
    }

    logger.warn('Object storage not configured — uploads are disabled');
    return new UnconfiguredStorageProvider();
  },
};
