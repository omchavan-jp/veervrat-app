import { ConfigService } from '@nestjs/config';
import { storageProviderFactory } from './storage-provider.factory';
import { S3StorageProvider } from './s3-storage.provider';
import { AzureBlobStorageProvider } from './azure-blob-storage.provider';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

const resolve = (config: ConfigService) => (storageProviderFactory as any).useFactory(config);

describe('storageProviderFactory', () => {
  it('chooses Azure Blob when all three Azure values are present', () => {
    const provider = resolve(
      makeConfig({
        AZURE_STORAGE_ACCOUNT_NAME: 'veervratuatuploads',
        AZURE_STORAGE_CONTAINER_NAME: 'uploads',
        AZURE_CLIENT_ID: 'abc-123',
      }),
    );
    expect(provider).toBeInstanceOf(AzureBlobStorageProvider);
  });

  it('chooses S3/MinIO when only the S3 values are present', () => {
    const provider = resolve(
      makeConfig({
        S3_ENDPOINT: 'http://localhost:9000',
        S3_ACCESS_KEY: 'veervrat',
        S3_SECRET_KEY: 'veervrat_local',
        S3_BUCKET: 'veervrat-uploads',
      }),
    );
    expect(provider).toBeInstanceOf(S3StorageProvider);
  });

  it('prefers Azure over S3 when both happen to be configured', () => {
    // Deliberate: Azure is the target of O15. Ambiguity here should be resolved the same way
    // every time, not by whichever branch happened to run first.
    const provider = resolve(
      makeConfig({
        AZURE_STORAGE_ACCOUNT_NAME: 'veervratuatuploads',
        AZURE_STORAGE_CONTAINER_NAME: 'uploads',
        AZURE_CLIENT_ID: 'abc-123',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_ACCESS_KEY: 'veervrat',
        S3_SECRET_KEY: 'veervrat_local',
        S3_BUCKET: 'veervrat-uploads',
      }),
    );
    expect(provider).toBeInstanceOf(AzureBlobStorageProvider);
  });

  it('falls back to an unconfigured provider that refuses every operation, with neither set', () => {
    const provider = resolve(makeConfig({}));
    expect(provider).not.toBeInstanceOf(AzureBlobStorageProvider);
    expect(provider).not.toBeInstanceOf(S3StorageProvider);
  });

  it('does not select Azure on a partial config — every one of the three values is required', async () => {
    const provider = resolve(
      makeConfig({
        AZURE_STORAGE_ACCOUNT_NAME: 'veervratuatuploads',
        // AZURE_STORAGE_CONTAINER_NAME and AZURE_CLIENT_ID missing
      }),
    );
    expect(provider).not.toBeInstanceOf(AzureBlobStorageProvider);
    await expect(provider.put('k', Buffer.from('x'), 'image/jpeg')).rejects.toThrow(
      'not configured',
    );
  });

  it('does not select S3 on a partial config', async () => {
    const provider = resolve(makeConfig({ S3_ENDPOINT: 'http://localhost:9000' }));
    expect(provider).not.toBeInstanceOf(S3StorageProvider);
    await expect(provider.put('k', Buffer.from('x'), 'image/jpeg')).rejects.toThrow(
      'not configured',
    );
  });

  it('the unconfigured fallback refuses every operation on the interface, not just put', async () => {
    const provider = resolve(makeConfig({}));
    await expect(provider.get('k')).rejects.toThrow('not configured');
    await expect(provider.delete('k')).rejects.toThrow('not configured');
    await expect(provider.signedUrl('k', 60)).rejects.toThrow('not configured');
  });
});
