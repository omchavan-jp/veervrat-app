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
  // Synchronous in the interface, so it throws rather than rejecting — same refusal, same
  // message, expressed the way this one operation is shaped.
  publicUrl(): never {
    throw new Error('File storage is not configured in this environment');
  }
}

/**
 * Picks the storage backend from whichever configuration is present — rather than a separate
 * `STORAGE_PROVIDER=azure|s3` toggle.
 *
 * One flag and one set of credentials can drift out of sync (the flag says azure, the Azure
 * vars are unset); detecting by presence means there is only one thing to get right per
 * environment. Local dev sets the S3/MinIO vars and nothing Azure-shaped; a deployed environment
 * sets the Azure vars and nothing S3-shaped, because there is no MinIO to point at there.
 *
 * **Both configured at once is refused, not silently resolved.** Which backend an upload lands
 * in is not a detail to guess at: picking wrong means writing user files to a store nobody is
 * reading from, and doing it quietly means nobody finds out until the files are missing. There
 * is no correct default here, so this throws at startup — a container that will not boot is a
 * far better failure than one that boots and writes to the wrong place.
 *
 * ⚠️ **`AZURE_CLIENT_ID` is a load-bearing part of that detection, and it is a name the wider
 * Azure ecosystem also uses** — `DefaultAzureCredential` reads it for service-principal auth
 * generally, not just for storage. If some future feature sets it for an unrelated Azure SDK in
 * an environment that also has the S3 vars, this now fails loudly at boot rather than silently
 * switching where uploads go. That is the intended outcome; the fix in that case is to give the
 * unrelated feature its own variable, not to weaken this check.
 */
export const storageProviderFactory: Provider = {
  provide: STORAGE_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): StorageProvider => {
    const accountName = config.get<string>('AZURE_STORAGE_ACCOUNT_NAME');
    const containerName = config.get<string>('AZURE_STORAGE_CONTAINER_NAME');
    // Published content (blog images) lives in its own container, because anonymous-read is a
    // per-container setting. Falls back to `<private>-public` so an environment that has not set
    // it yet still boots and still keeps the two apart — it never silently shares one container,
    // which would make every blog upload publicly readable AND every chat upload with it.
    const publicContainerName =
      config.get<string>('AZURE_STORAGE_PUBLIC_CONTAINER_NAME') ??
      (containerName ? `${containerName}-public` : undefined);
    const managedIdentityClientId = config.get<string>('AZURE_CLIENT_ID');
    const azureConfigured = Boolean(accountName && containerName && managedIdentityClientId);

    const endpoint = config.get<string>('S3_ENDPOINT');
    const accessKeyId = config.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = config.get<string>('S3_SECRET_KEY');
    const bucket = config.get<string>('S3_BUCKET');
    const publicBucket =
      config.get<string>('S3_PUBLIC_BUCKET') ?? (bucket ? `${bucket}-public` : undefined);
    // Base only — the bucket is appended by the provider, which knows which of the two it is
    // addressing. Previously this baked the private bucket into the base.
    const publicBase = config.get<string>('S3_PUBLIC_URL') ?? endpoint;
    const s3Configured = Boolean(
      endpoint && accessKeyId && secretAccessKey && bucket && publicBase,
    );

    if (azureConfigured && s3Configured) {
      throw new Error(
        'Object storage is ambiguously configured: both Azure Blob ' +
          `(AZURE_STORAGE_ACCOUNT_NAME=${accountName}) and S3-compatible (S3_ENDPOINT=${endpoint}) ` +
          'are fully set. Refusing to guess which one uploads should go to — unset whichever ' +
          'does not belong in this environment. See storage-provider.factory.ts.',
      );
    }

    if (azureConfigured) {
      logger.log(`Object storage: Azure Blob (${accountName}/${containerName})`);
      return new AzureBlobStorageProvider({
        accountName: accountName as string,
        containerName: containerName as string,
        publicContainerName: publicContainerName as string,
        managedIdentityClientId: managedIdentityClientId as string,
      });
    }

    if (s3Configured) {
      logger.log(`Object storage: S3-compatible (${endpoint}/${bucket})`);
      return new S3StorageProvider({
        endpoint: endpoint as string,
        region: config.get<string>('S3_REGION', 'us-east-1'),
        bucket: bucket as string,
        publicBucket: publicBucket as string,
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
        publicBase: publicBase as string,
      });
    }

    logger.warn('Object storage not configured — uploads are disabled');
    return new UnconfiguredStorageProvider();
  },
};
